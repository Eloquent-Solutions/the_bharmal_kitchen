import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { businessDate, expectedShiftCash, buildFinanceReport } from '../src/utils/finance.js';

const [host = '127.0.0.1', port = '8080'] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
let environment, vite, finance, billing, inventory, kitchen;
const actor = (uid = 'owner') => ({ uid, displayName: uid });
const as = (uid = 'owner') => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const today = businessDate();
const yesterday = new Date(`${today}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const prior = yesterday.toISOString().slice(0, 10);
const shift = (id = 'shift-1', date = today) => ({ id, shiftName: id, openingCash: 500, businessDate: date });
const bill = (id, extra = {}) => ({ id, items: [{ id: 'dish', quantity: 1, price: 100 }], orderType: 'takeaway', paymentMethod: 'cash', paymentReceived: true, createdBy: 'Owner', createdById: 'owner', ...extra });

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  process.env.VITE_DATA_MODE = 'demo'; process.env.VITE_BILLING_ENABLED = 'true'; process.env.VITE_FINANCE_ENABLED = 'true';
  environment = await initializeTestEnvironment({ projectId: 'demo-tbk-finance', firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') } });
  vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  finance = await vite.ssrLoadModule('/src/services/financeCloud.js');
  billing = await vite.ssrLoadModule('/src/services/billingCloud.js');
  inventory = await vite.ssrLoadModule('/src/services/inventoryCloud.js');
  kitchen = await vite.ssrLoadModule('/src/services/kitchenCloud.js');
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role] of [['owner', 'Owner'], ['manager', 'Manager'], ['accountant', 'Accountant'], ['cashier', 'Cashier'], ['chef', 'Chef'], ['customer', 'Customer'], ['inventory', 'Inventory Manager']]) {
      await setDoc(doc(db, 'users', uid), { uid, role, status: 'active', email: `${uid}@example.test`, allowedTabs: [] });
    }
    await setDoc(doc(db, 'menu_items', 'dish'), { id: 'dish', name: 'Test dish', price: 100, isAvailable: true });
    await setDoc(doc(db, 'recipes', 'recipe'), { id: 'recipe', dishId: 'dish', yieldServings: 1, ingredients: [{ id: 'rice', qty: 0.5, unit: 'kg' }] });
    await setDoc(doc(db, 'raw_materials', 'rice'), { id: 'rice', name: 'Rice', currentStock: 100, unitCost: 20, unit: 'kg' });
    await setDoc(doc(db, 'settings', 'restaurant'), { cgstRate: 2.5, sgstRate: 2.5, roundOff: false });
  });
});
after(async () => { await vite?.close(); await environment?.cleanup(); });

test('only one register shift opens under concurrent requests', async () => {
  const results = await Promise.allSettled([finance.openRegisterShift(shift('one'), as(), actor()), finance.openRegisterShift(shift('two'), as('manager'), actor('manager'))]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await getDocs(collection(as(), 'shifts'))).size, 1);
});

test('cash/UPI/pending bills, expenses, reversal, transfers and supplier payments reconcile exactly once', async () => {
  const db = as();
  await assert.rejects(billing.placePosOrderCloud(bill('no-shift'), db), /Open a register shift/);
  await finance.openRegisterShift(shift(), db, actor());
  const order = await billing.placePosOrderCloud(bill('cash'), db);
  assert.equal(order.ingredientCost, 10); assert.equal(order.costComplete, true);
  await billing.placePosOrderCloud(bill('cash'), db);
  await billing.placePosOrderCloud(bill('upi', { paymentMethod: 'upi' }), db);
  await billing.placePosOrderCloud(bill('pending', { paymentReceived: false }), db);
  await finance.recordFinanceExpense({ id: 'exp', title: 'Packaging', category: 'Packaging', amount: 40, method: 'cash' }, db, actor());
  await finance.recordFinanceExpense({ id: 'exp', title: 'Packaging', category: 'Packaging', amount: 40, method: 'cash' }, db, actor());
  await finance.voidFinanceExpense('exp', 'Wrong receipt', db, actor());
  await finance.voidFinanceExpense('exp', 'Wrong receipt', db, actor());
  await finance.recordFinanceExpense({ id: 'exp2', title: 'Packaging', category: 'Packaging', amount: 40, method: 'cash' }, db, actor());
  await finance.recordCashMovement({ id: 'topup', amount: 50, direction: 'in', reason: 'Float top-up' }, db, actor());
  await finance.recordCashMovement({ id: 'deposit', amount: 20, direction: 'out', reason: 'Bank deposit' }, db, actor());
  const supplierInput = { id: 'supplier-request', supplier: 'Supplier', invoiceNumber: 'INV-1', items: [{ type: 'raw_material', itemId: 'rice', qty: 1, unitCost: 60 }], paymentStatus: 'paid', paymentMethod: 'cash' };
  const supplierId = await inventory.savePurchaseBillCloud(supplierInput, null, db, actor());
  await inventory.savePurchaseBillCloud(supplierInput, null, db, actor());
  await inventory.savePurchaseBillCloud({ ...supplierInput, id: supplierId }, { id: supplierId }, db, actor());
  const current = (await getDoc(doc(db, 'shifts', 'shift-1'))).data();
  assert.equal(current.cashSales, 105); assert.equal(current.upiSales, 105);
  assert.equal(current.supplierCash, 60); assert.equal(expectedShiftCash(current), 535);
  await assert.rejects(finance.closeRegisterShift({ id: 'shift-1', actualCash: 530 }, db, actor()), /reason/);
  await finance.closeRegisterShift({ id: 'shift-1', actualCash: 530, note: 'Five rupees short' }, db, actor());
  await assert.rejects(finance.closeBusinessDay({ date: today }, db, actor()), /unpaid/);
  const close = await finance.closeBusinessDay({ date: today, acknowledgeUnpaid: true }, db, actor());
  assert.equal(close.grossSales, 315); assert.equal(close.collected, 210); assert.equal(close.expenses, 40); assert.equal(close.variance, -5);
  assert.equal(close.cgst, 7.5); assert.equal(close.sgst, 7.5);
  assert.equal((await finance.closeBusinessDay({ date: today, acknowledgeUnpaid: true }, db, actor())).id, today);
  await assert.rejects(finance.openRegisterShift(shift('closed-day'), db, actor()), /already closed/);
  await assertFails(deleteDoc(doc(db, 'expenses', 'exp2')));
  await assertFails(updateDoc(doc(db, 'shifts', 'shift-1'), { openingCash: 9999 }));
  await assertFails(updateDoc(doc(db, 'day_close', today), { grossSales: 0 }));
  await assertFails(updateDoc(doc(db, 'finance_entries', 'PAY-cash'), { amount: 1 }));
  await assertFails(updateDoc(doc(as('chef'), 'orders', 'cash'), { total: 1 }));
  await assertFails(updateDoc(doc(db, 'orders', 'cash'), { ingredientCost: 0 }));
  await assertFails(deleteDoc(doc(db, 'orders', 'cash')));
});

test('late pickup payment belongs to its collection day and preserves original bill costs', async () => {
  const db = as();
  await finance.openRegisterShift(shift('yesterday', prior), db, actor());
  const original = await billing.placePosOrderCloud(bill('late', { paymentReceived: false }), db);
  await finance.closeRegisterShift({ id: 'yesterday', actualCash: 500 }, db, actor());
  await finance.closeBusinessDay({ date: prior, acknowledgeUnpaid: true }, db, actor());
  await finance.openRegisterShift(shift('today'), db, actor());
  await updateDoc(doc(db, 'raw_materials', 'rice'), { unitCost: 400 });
  await billing.markPosOrderPaidCloud('late', 'cash', db, actor());
  await billing.markPosOrderPaidCloud('late', 'cash', db, actor());
  const paid = (await getDoc(doc(db, 'orders', 'late'))).data();
  assert.equal(original.businessDate, prior); assert.equal(paid.paymentBusinessDate, today); assert.equal(paid.ingredientCost, 10);
  assert.equal((await getDoc(doc(db, 'shifts', 'today'))).data().cashSales, 105);
  const report = buildFinanceReport({ orders: [paid], entries: [(await getDoc(doc(db, 'finance_entries', 'PAY-late'))).data()] }, today, today);
  assert.equal(report.grossSales, 0); assert.equal(report.collected, 105);
});

test('payment racing a shift close is either counted or rejected atomically', async () => {
  const db = as(); await finance.openRegisterShift(shift(), db, actor());
  await billing.placePosOrderCloud(bill('race', { paymentReceived: false }), db);
  await Promise.allSettled([billing.markPosOrderPaidCloud('race', 'cash', db, actor()), finance.closeRegisterShift({ id: 'shift-1', actualCash: 500, note: 'Concurrent count' }, db, actor())]);
  const order = (await getDoc(doc(db, 'orders', 'race'))).data();
  const session = (await getDoc(doc(db, 'shifts', 'shift-1'))).data();
  assert.equal(session.cashSales, order.paymentStatus === 'paid' ? 105 : 0);
  if (session.status === 'closed') assert.equal(session.expectedCash, expectedShiftCash(session));
});

test('accountant is read-only and other staff/customers cannot access finance', async () => {
  await finance.openRegisterShift(shift(), as(), actor());
  await assertSucceeds(getDocs(collection(as('accountant'), 'shifts')));
  await assert.rejects(finance.recordCashMovement({ amount: 10, direction: 'in', reason: 'Test' }, as('accountant'), actor('accountant')));
  for (const uid of ['customer', 'cashier', 'chef', 'inventory']) await assertFails(getDoc(doc(as(uid), 'finance_registers', 'main')));
  await assert.rejects(finance.openRegisterShift(shift('unauthorized'), as('customer'), actor('customer')));
});

test('paid cancellation is blocked and missing ingredient prices remain incomplete', async () => {
  const db = as(); await finance.openRegisterShift(shift(), db, actor());
  await updateDoc(doc(db, 'raw_materials', 'rice'), { unitCost: 0 });
  const order = await billing.placePosOrderCloud(bill('uncosted'), db);
  assert.equal(order.costComplete, false);
  await assert.rejects(kitchen.advanceOrderCloud('uncosted', 'cancelled', db), /refund/);
});

test('cash cannot go negative and retries cannot silently change saved amounts', async () => {
  const db = as(); await finance.openRegisterShift(shift(), db, actor());
  await assert.rejects(finance.recordCashMovement({ id: 'large', amount: 501, direction: 'out', reason: 'Bank' }, db, actor()), /Not enough cash/);
  assert.equal((await getDoc(doc(db, 'finance_entries', 'large'))).exists(), false);
  const expense = { id: 'same', title: 'Rent', category: 'Rent', amount: 100, method: 'cash' };
  await finance.recordFinanceExpense(expense, db, actor());
  await assert.rejects(finance.recordFinanceExpense({ ...expense, amount: 200 }, db, actor()), /different values/);
  assert.equal((await getDoc(doc(db, 'shifts', 'shift-1'))).data().cashExpenses, 100);
});
