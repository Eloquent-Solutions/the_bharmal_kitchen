import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

const [host = '127.0.0.1', port = '8080'] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
let environment;
let vite;
let billing;
let inventory;
let receipt;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Start this test through firebase emulators:exec');
  process.env.VITE_DATA_MODE = 'demo';
  environment = await initializeTestEnvironment({
    projectId: 'demo-tbk-billing',
    firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
  });
  vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom',
  });
  billing = await vite.ssrLoadModule('/src/services/billingCloud.js');
  inventory = await vite.ssrLoadModule('/src/services/inventoryCloud.js');
  receipt = await vite.ssrLoadModule('/src/utils/billingReceipt.js');
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    for (const [uid, role] of [['owner', 'Owner'], ['manager', 'Manager'], ['cashier', 'Cashier']]) {
      await setDoc(doc(database, 'users', uid), { uid, email: `${uid}@example.test`, role, status: 'active', allowedTabs: [] });
    }
    await setDoc(doc(database, 'menu_items', 'dish-1'), { id: 'dish-1', name: 'Rice Dish', price: 100, isAvailable: true, station: 'Kitchen' });
    await setDoc(doc(database, 'recipes', 'recipe-1'), {
      id: 'recipe-1', dishId: 'dish-1', dishName: 'Rice Dish', yieldServings: 2,
      ingredients: [{ id: 'rice', name: 'Rice', qty: 1, unit: 'kg' }],
    });
    await setDoc(doc(database, 'raw_materials', 'rice'), {
      id: 'rice', name: 'Rice', unit: 'kg', currentStock: 3, unitCost: 20, reorderLevel: 1,
    });
    await setDoc(doc(database, 'settings', 'restaurant'), { cgstRate: 2.5, sgstRate: 2.5, serviceCharge: 0, roundOff: false });
  });
});

after(async () => { await vite?.close(); await environment?.cleanup(); });

const as = (uid) => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const input = (id, overrides = {}) => ({
  id, items: [{ id: 'dish-1', quantity: 2, price: 100 }], orderType: 'takeaway',
  paymentMethod: 'upi', paymentReceived: false, createdBy: 'Test Owner', ...overrides,
});

test('POS bill, kitchen ticket, and stock ledger commit together; retry is idempotent', async () => {
  const database = as('owner');
  const order = await billing.placePosOrderCloud(input('TBK-test-1'), database);
  assert.equal(order.total, 210);
  assert.equal(order.paymentStatus, 'pending');
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 2);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
  assert.equal((await getDocs(collection(database, 'kots'))).size, 1);
  await billing.placePosOrderCloud(input('TBK-test-1'), database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 2);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
  assert.match(receipt.buildBillingReceiptHtml(order), /PAYMENT DUE/);
  assert.match(receipt.buildBillingReceiptHtml(order), /₹210\.00/);
});

test('paid status requires explicit confirmation and can be recorded once later', async () => {
  const database = as('manager');
  await billing.placePosOrderCloud(input('TBK-test-2', { orderType: 'dine_in', table: 'T-1' }), database);
  await billing.markPosOrderPaidCloud('TBK-test-2', 'cash', database);
  await billing.markPosOrderPaidCloud('TBK-test-2', 'cash', database);
  const order = (await getDoc(doc(database, 'orders', 'TBK-test-2'))).data();
  assert.equal(order.paymentStatus, 'paid');
  assert.equal(order.paymentMethod, 'cash');
  assert.match(receipt.buildBillingReceiptHtml(order), /PAID · CASH/);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 2);
});

test('insufficient stock and changed prices leave no bill or stock movement', async () => {
  const database = as('owner');
  await assert.rejects(billing.placePosOrderCloud(input('TBK-too-many', { items: [{ id: 'dish-1', quantity: 7, price: 100 }] }), database), /Not enough Rice/);
  await assert.rejects(billing.placePosOrderCloud(input('TBK-stale-price', { items: [{ id: 'dish-1', quantity: 1, price: 99 }] }), database), /price changed/);
  await assert.rejects(billing.placePosOrderCloud(input('TBK-stale-tax', { expectedTotal: 200 }), database), /Bill totals changed/);
  assert.equal((await getDocs(collection(database, 'orders'))).size, 0);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 0);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 3);
});

test('concurrent bills cannot oversell the same stock', async () => {
  const database = as('owner');
  const results = await Promise.allSettled([
    billing.placePosOrderCloud(input('TBK-concurrent-a', { items: [{ id: 'dish-1', quantity: 4, price: 100 }] }), database),
    billing.placePosOrderCloud(input('TBK-concurrent-b', { items: [{ id: 'dish-1', quantity: 4, price: 100 }] }), database),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 1);
  assert.equal((await getDocs(collection(database, 'orders'))).size, 1);
});

test('cashier cannot directly write raw stock through billing', async () => {
  await assert.rejects(billing.placePosOrderCloud(input('TBK-cashier'), as('cashier')));
  assert.equal((await getDocs(collection(as('owner'), 'orders'))).size, 0);
});

test('duplicate supplier invoice cannot receive stock twice under a new bill ID', async () => {
  const database = as('manager');
  const bill = {
    id: 'BILL-one', supplier: 'Test Supplier', invoiceNumber: 'SUP-77',
    items: [{ type: 'raw_material', itemId: 'rice', name: 'Rice', qty: 2, unitCost: 20 }], gstAmount: 2,
  };
  const savedId = await inventory.savePurchaseBillCloud(bill, null, database);
  await assert.rejects(inventory.savePurchaseBillCloud({ ...bill, id: 'BILL-two' }, null, database), /already been recorded/);
  await inventory.savePurchaseBillCloud(bill, null, database);
  const receivedBill = (await getDoc(doc(database, 'purchase_bills', savedId))).data();
  await inventory.savePurchaseBillCloud({ ...receivedBill, paymentStatus: 'paid' }, receivedBill, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 5);
  const paidBill = (await getDoc(doc(database, 'purchase_bills', savedId))).data();
  assert.equal(paidBill.paymentStatus, 'paid');
  assert.ok(paidBill.paidAt);
  assert.equal((await getDocs(collection(database, 'purchase_bills'))).size, 1);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
});

test('receipt escapes guest and item text', () => {
  const html = receipt.buildBillingReceiptHtml({ id: 'TBK-1', customer: '<script>alert(1)</script>', items: [{ name: '<img>', qty: 1, price: 1 }], total: 1 });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img&gt;/);
});
