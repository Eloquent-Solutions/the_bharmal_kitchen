import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';

process.env.VITE_DATA_MODE = 'demo';
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  clear: () => storage.clear(),
};
globalThis.window = { dispatchEvent: () => {} };

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: { server: createHttpServer() } },
  appType: 'custom',
});
const inventory = await vite.ssrLoadModule('/src/services/dataService.js');

test('inventory movements stay consistent across adjustments, wastage, count, bills, and recipes', async (t) => {
  try {
    await t.test('over-deduction changes neither stock nor ledger', () => {
      storage.clear();
      const before = inventory.getRawMaterials()[0];
      assert.throws(() => inventory.adjustRawMaterialStock(before.id, before.currentStock + 1, 'subtract'), /Only/);
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock);
      assert.equal(inventory.getStockMovements().length, 0);
      assert.throws(() => inventory.deleteRawMaterial(before.id), /zero stock/);
    });

    await t.test('wastage requires a real material and records exactly one movement', () => {
      storage.clear();
      assert.throws(() => inventory.saveWastageLog({ materialId: 'missing', qty: 1 }), /Select a raw material/);
      const before = inventory.getRawMaterials()[0];
      const previousLogs = inventory.getWastageLogs().length;
      inventory.saveWastageLog({ materialId: before.id, qty: 1, reason: 'Test spoilage' });
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock - 1);
      assert.equal(inventory.getWastageLogs().length, previousLogs + 1);
      assert.equal(inventory.getWastageLogs()[0].cost, before.unitCost);
      assert.equal(inventory.getStockMovements().length, 1);
    });

    await t.test('invalid physical counts cannot erase stock', () => {
      storage.clear();
      const before = inventory.getRawMaterials()[0];
      assert.throws(() => inventory.reconcileAllPhysicalStock([{ id: before.id, name: before.name, countedStock: '' }]), /valid non-negative/);
      assert.throws(() => inventory.reconcilePhysicalStockItem({ id: before.id, countedStock: -2 }), /valid non-negative/);
      assert.throws(() => inventory.reconcileAllPhysicalStock([{ id: before.id, name: before.name, systemStock: before.currentStock + 1, countedStock: before.currentStock }]), /changed since this count/);
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock);
      inventory.reconcilePhysicalStockItem({ id: before.id, countedStock: before.currentStock - 1 });
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock - 1);
      assert.equal(inventory.getStockMovements()[0].materialId, before.id);
    });

    await t.test('purchase bill receives stock only on creation', () => {
      storage.clear();
      const before = inventory.getRawMaterials()[0];
      const purchaseCost = before.unitCost + 20;
      const bill = { invoiceNumber: 'TEST-1', supplier: 'Test Supplier', items: [{ type: 'raw_material', itemId: before.id, name: before.name, qty: 2, unit: before.unit, unitCost: purchaseCost }] };
      const saved = inventory.savePurchaseBill(bill)[0];
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock + 2);
      assert.equal(inventory.getRawMaterials()[0].unitCost, Number(((before.currentStock * before.unitCost + 2 * purchaseCost) / (before.currentStock + 2)).toFixed(2)));
      inventory.savePurchaseBill({ ...saved, paymentStatus: 'paid' });
      assert.equal(inventory.getRawMaterials()[0].currentStock, before.currentStock + 2);
      assert.equal(inventory.getStockMovements().length, 1);
    });

    await t.test('invalid bill lines and utensil quantities cannot change stock', () => {
      storage.clear();
      const utensil = inventory.getUtensils()[0];
      assert.throws(() => inventory.saveUtensil({ ...utensil, inUse: utensil.totalQty, inCleaning: 1 }), /cannot exceed/);
      assert.throws(() => inventory.savePurchaseBill({ supplier: 'Test', items: [{ type: 'utensil', itemId: utensil.id, qty: 1.5, unitCost: 10 }] }), /whole pieces/);
      assert.equal(inventory.getUtensils()[0].totalQty, utensil.totalQty);
      assert.equal(inventory.getPurchaseBills().length, 2);
    });

    await t.test('batch yield applies to portions, cost, and order deductions', () => {
      storage.clear();
      const material = inventory.getRawMaterials()[0];
      const dish = { id: 'TEST-DISH', name: 'Test dish', price: 100 };
      inventory.saveRecipe({ dishId: dish.id, dishName: dish.name, yieldServings: 2, sellingPrice: 100, ingredients: [{ id: material.id, name: material.name, qty: 2, unit: material.unit, cost: 2 * material.unitCost }] });
      assert.equal(inventory.getMenuItems().find((item) => item.id === dish.id).costPrice, material.unitCost);
      assert.equal(inventory.calculateDishPortionsAvailable(dish.id).portionsAvailable, Math.floor(material.currentStock));
      assert.throws(() => inventory.assertOrderIngredientsAvailable([{ ...dish, quantity: material.currentStock }, { ...dish, quantity: 1 }]), /Not enough/);
      assert.equal(inventory.getRawMaterials()[0].currentStock, material.currentStock);
      inventory.deductIngredientsForOrder([{ ...dish, quantity: 2 }], 'TEST-ORDER');
      assert.equal(inventory.getRawMaterials()[0].currentStock, material.currentStock - 2);
      assert.equal(inventory.getStockMovements()[0].qty, 2);
    });
  } finally {
    await vite.close();
  }
});
