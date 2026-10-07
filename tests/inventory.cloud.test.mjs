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
let inventory;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Start this test through firebase emulators:exec');
  process.env.VITE_DATA_MODE = 'demo';
  environment = await initializeTestEnvironment({
    projectId: 'demo-tbk-inventory',
    firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
  });
  vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  });
  inventory = await vite.ssrLoadModule('/src/services/inventoryCloud.js');
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    for (const [uid, role] of [['owner', 'Owner'], ['inventory', 'Inventory Manager'], ['cashier', 'Cashier']]) {
      await setDoc(doc(database, 'users', uid), {
        uid, email: `${uid}@example.test`, role, status: 'active', allowedTabs: [],
      });
    }
    await setDoc(doc(database, 'raw_materials', 'rice'), {
      id: 'rice', name: 'Rice', category: 'Grains', unit: 'kg', currentStock: 10, unitCost: 20, reorderLevel: 2,
    });
    await setDoc(doc(database, 'utensils', 'pot'), {
      id: 'pot', name: 'Pot', totalQty: 3, inUse: 0, inCleaning: 0, unitCost: 100,
    });
  });
});

after(async () => {
  await vite?.close();
  await environment?.cleanup();
});

const as = (uid) => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();

test('concurrent stock movements retain both changes and ledger entries', async () => {
  const database = as('inventory');
  await Promise.all([
    inventory.adjustRawMaterialStockCloud('rice', 2, 'add', 'Delivery A', null, database),
    inventory.adjustRawMaterialStockCloud('rice', 3, 'add', 'Delivery B', null, database),
  ]);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 15);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 2);
});

test('opening stock is recorded once when material creation is retried', async () => {
  const database = as('inventory');
  const material = {
    id: 'RM-new-test', name: 'Flour', category: 'Grains', unit: 'kg',
    currentStock: 5, unitCost: 42, reorderLevel: 1, supplier: 'Test supplier',
  };
  await inventory.saveRawMaterialCloud(material, null, database);
  await inventory.saveRawMaterialCloud(material, null, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', material.id))).data().currentStock, 5);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
});

test('manual adjustment and wastage retries do not change stock twice', async () => {
  const database = as('inventory');
  await inventory.adjustRawMaterialStockCloud('rice', 2, 'add', 'Delivery', null, database, 'MOV-retry');
  await inventory.adjustRawMaterialStockCloud('rice', 2, 'add', 'Delivery', null, database, 'MOV-retry');
  const log = { id: 'WST-retry', materialId: 'rice', qty: 3, reason: 'Spoiled' };
  await inventory.saveWastageCloud(log, database);
  await inventory.saveWastageCloud(log, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 9);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 2);
  assert.equal((await getDocs(collection(database, 'wastage'))).size, 1);
});

test('wastage and stock counts reject invalid or stale quantities without changing stock', async () => {
  const database = as('inventory');
  await assert.rejects(inventory.saveWastageCloud({ materialId: 'rice', qty: 11, reason: 'Spoiled' }, database), /Only 10/);
  await assert.rejects(inventory.reconcilePhysicalStockCloud([
    { id: 'rice', name: 'Rice', systemStock: 9, countedStock: 8 },
  ], 'Audit', database), /changed since this count/);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 10);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 0);
  await inventory.saveWastageCloud({ materialId: 'rice', qty: 2, reason: 'Spoiled' }, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 8);
  assert.equal((await getDocs(collection(database, 'wastage'))).size, 1);
});

test('a bill receives each item once and payment edit cannot receive stock again', async () => {
  const database = as('inventory');
  const items = [
    { type: 'raw_material', itemId: 'rice', name: 'Rice', qty: 2, unitCost: 30, total: 60 },
    { type: 'raw_material', itemId: 'rice', name: 'Rice', qty: 1, unitCost: 40, total: 40 },
    { type: 'utensil', itemId: 'pot', name: 'Pot', qty: 2, unitCost: 100, total: 200 },
  ];
  const draft = { id: 'BILL-test-retry', supplier: 'Test', invoiceNumber: 'T-1', items, totalAmount: 300 };
  const id = await inventory.savePurchaseBillCloud(draft, null, database);
  const bill = (await getDoc(doc(database, 'purchase_bills', id))).data();
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 13);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().unitCost, 23.08);
  assert.equal((await getDoc(doc(database, 'utensils', 'pot'))).data().totalQty, 5);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
  await inventory.savePurchaseBillCloud(draft, null, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 13);
  await inventory.savePurchaseBillCloud({ ...bill, paymentStatus: 'paid' }, bill, database);
  assert.equal((await getDoc(doc(database, 'raw_materials', 'rice'))).data().currentStock, 13);
  assert.equal((await getDocs(collection(database, 'stock_movements'))).size, 1);
  await assert.rejects(inventory.savePurchaseBillCloud({ ...bill, paymentStatus: 'pending', items: [{ ...items[0], qty: 10 }] }, bill, database), /cannot be edited/);
});

test('Firestore rejects a stock transaction for a cashier', async () => {
  await assert.rejects(
    inventory.adjustRawMaterialStockCloud('rice', 1, 'add', 'Unauthorized', null, as('cashier')),
  );
});

test('owner can assign inventory access and staff cannot assign roles', async () => {
  const ownerDatabase = as('owner');
  await inventory.saveUserAccessCloud({
    id: 'cashier', name: 'Stock Staff', email: 'cashier@example.test',
    role: 'Inventory Manager', status: 'active', allowedTabs: ['inventory', 'purchasing', 'reports'],
  }, ownerDatabase);
  assert.equal((await getDoc(doc(ownerDatabase, 'users', 'cashier'))).data().role, 'Inventory Manager');
  await assert.rejects(inventory.saveUserAccessCloud({
    id: 'owner', name: 'Changed', email: 'owner@example.test',
    role: 'Inventory Manager', status: 'active', allowedTabs: ['inventory'],
  }, as('cashier')));
});
