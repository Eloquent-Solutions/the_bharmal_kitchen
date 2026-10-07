import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { calculateOrderTotals } from '../utils/calculations';

const stock = (value) => Number(value.toFixed(3));
const stockRequired = (value) => stock(Math.ceil(value * 1000 - 0.0000001) / 1000);

function validRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export async function placePosOrderCloud(input, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('Add at least one dish.');
  if (!['dine_in', 'takeaway'].includes(input.orderType)) throw new Error('Choose Dine-in or Takeaway.');
  if (input.orderType === 'dine_in' && !input.table?.trim()) throw new Error('Enter a table for Dine-in.');
  if (!['cash', 'upi'].includes(input.paymentMethod)) throw new Error('Choose Cash or UPI.');
  const items = input.items.map((item) => {
    const qty = Number(item.quantity ?? item.qty);
    if (!item.id || item.isCombo || !Number.isInteger(qty) || qty <= 0 || qty > 999) {
      throw new Error('Every bill line needs a valid dish and whole-number quantity. Combos need recipes before billing.');
    }
    return { id: item.id, quantity: qty, displayedPrice: Number(item.price) };
  });
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Duplicate dish in bill. Reload and try again.');

  const id = input.id || `TBK-${crypto.randomUUID()}`;
  const recipeDocs = await getDocs(collection(database, 'recipes'));
  const recipeByDish = new Map();
  recipeDocs.forEach((snapshot) => {
    const recipe = snapshot.data();
    if (recipe.dishId && !recipeByDish.has(recipe.dishId)) recipeByDish.set(recipe.dishId, snapshot.ref);
  });
  for (const item of items) {
    if (!recipeByDish.has(item.id)) throw new Error(`Add a recipe for this dish before billing: ${item.id}.`);
  }

  const orderRef = doc(database, 'orders', id);
  const menuRefs = items.map((item) => doc(database, 'menu_items', item.id));
  const recipeRefs = items.map((item) => recipeByDish.get(item.id));
  const settingsRef = doc(database, 'settings', 'restaurant');

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(orderRef);
    if (existing.exists()) {
      if (existing.data().clientRequestId === id) return { id, ...existing.data() };
      throw new Error('This bill ID is already in use. Reload billing.');
    }
    const [menuSnapshots, recipeSnapshots, settingsSnapshot] = await Promise.all([
      Promise.all(menuRefs.map((ref) => transaction.get(ref))),
      Promise.all(recipeRefs.map((ref) => transaction.get(ref))),
      transaction.get(settingsRef),
    ]);
    const billedItems = items.map((item, index) => {
      if (!menuSnapshots[index].exists()) throw new Error('A dish is no longer available. Reload billing.');
      const menu = menuSnapshots[index].data();
      if (menu.isAvailable === false) throw new Error('A dish is no longer available. Reload billing.');
      const price = Number(menu.price);
      if (!Number.isFinite(price) || price < 0 || price !== item.displayedPrice) throw new Error('A dish price changed. Reload billing.');
      return { id: item.id, name: menu.name, qty: item.quantity, quantity: item.quantity, price, station: menu.station || '' };
    });
    const requirements = new Map();
    for (const [index, snapshot] of recipeSnapshots.entries()) {
      if (!snapshot.exists()) throw new Error('A recipe was removed. Reload billing.');
      const recipe = snapshot.data();
      if (recipe.dishId !== items[index].id || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
        throw new Error(`A valid recipe is required for ${billedItems[index].name}.`);
      }
      const yieldServings = Number(recipe.yieldServings);
      if (!Number.isFinite(yieldServings) || yieldServings <= 0) throw new Error(`Invalid recipe yield for ${billedItems[index].name}.`);
      for (const ingredient of recipe.ingredients) {
        const perBatch = Number(ingredient.qty);
        if (!ingredient.id || !Number.isFinite(perBatch) || perBatch <= 0) throw new Error(`Invalid recipe ingredient for ${billedItems[index].name}.`);
        const required = perBatch * items[index].quantity / yieldServings;
        requirements.set(ingredient.id, (requirements.get(ingredient.id) || 0) + required);
      }
    }
    const materialRefs = [...requirements.keys()].map((materialId) => doc(database, 'raw_materials', materialId));
    const materialSnapshots = await Promise.all(materialRefs.map((ref) => transaction.get(ref)));
    const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
    const totals = calculateOrderTotals(billedItems, {
      cgstRate: validRate(settings.cgstRate),
      sgstRate: validRate(settings.sgstRate),
      serviceChargeRate: validRate(settings.serviceCharge),
      roundOff: settings.roundOff !== false,
    });
    if (totals.total <= 0) throw new Error('Bill total must be greater than zero.');
    if (input.expectedTotal != null && Number(input.expectedTotal) !== totals.total) {
      throw new Error('Bill totals changed. Reload billing and review the amount before saving.');
    }
    const createdAt = new Date().toISOString();
    const order = {
      id, clientRequestId: id, orderType: input.orderType, table: input.orderType === 'dine_in' ? input.table.trim() : null,
      customer: input.customer?.trim() || 'Walk-in Guest', phone: input.phone?.trim() || null,
      items: billedItems, ...totals, paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentReceived ? 'paid' : 'pending',
      paidAt: input.paymentReceived ? createdAt : null, status: 'received',
      createdAt, createdBy: input.createdBy || 'POS Staff', createdById: input.createdById || null,
      updatedAt: serverTimestamp(),
    };
    transaction.set(orderRef, order);
    transaction.set(doc(database, 'kots', `KOT-${id}`), {
      id: `KOT-${id}`, orderId: id, table: order.table || 'Takeaway',
      station: billedItems[0].station || 'Kitchen', items: billedItems.map((item) => `${item.name} (${item.qty})`).join(', '),
      itemsList: billedItems, createdAt, status: 'active', updatedAt: serverTimestamp(),
    });
    for (const [index, materialRef] of materialRefs.entries()) {
      const snapshot = materialSnapshots[index];
      if (!snapshot.exists()) throw new Error('A raw material was removed. Reload billing.');
      const material = snapshot.data();
      const required = stockRequired(requirements.get(snapshot.id));
      const available = Number(material.currentStock);
      if (!Number.isFinite(available) || available + 0.0000001 < required) {
        throw new Error(`Not enough ${material.name}: need ${required} ${material.unit}, available ${material.currentStock} ${material.unit}.`);
      }
      transaction.update(materialRef, { currentStock: stock(available - required), updatedAt: serverTimestamp() });
      transaction.set(doc(database, 'stock_movements', `MOV-${id}-${snapshot.id}`), {
        id: `MOV-${id}-${snapshot.id}`, materialId: snapshot.id, material: material.name,
        type: 'outward', qty: required, unit: material.unit, source: `POS Order #${id}`,
        user: input.createdBy || 'POS Staff', date: createdAt, updatedAt: serverTimestamp(),
      });
    }
    return order;
  });
}

export async function markPosOrderPaidCloud(orderId, paymentMethod, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!['cash', 'upi'].includes(paymentMethod)) throw new Error('Choose Cash or UPI.');
  const orderRef = doc(database, 'orders', orderId);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error('Bill was removed. Reload history.');
    const order = snapshot.data();
    if (order.paymentStatus === 'paid') return;
    if (order.status === 'cancelled') throw new Error('Cancelled bills cannot be marked paid.');
    transaction.update(orderRef, { paymentStatus: 'paid', paymentMethod, paidAt: new Date().toISOString(), updatedAt: serverTimestamp() });
  });
}
