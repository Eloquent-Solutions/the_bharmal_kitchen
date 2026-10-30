import { collection, doc, getDocs, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFinanceEnabled } from '../firebase/config';
import { calculateOrderTotals } from '../utils/calculations';
import { isValidPickupPhone } from '../utils/phone';
import { planPrintJobs } from '../utils/printRouting';
import { businessDate, money } from '../utils/finance';
import { readRegisterContext, writePaymentEntry, writeRegisterMutation } from './financeCloud';

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
    if (recipe.status !== 'draft' && recipe.dishId && !recipeByDish.has(recipe.dishId)) recipeByDish.set(recipe.dishId, snapshot.ref);
  });
  for (const item of items) {
    if (!recipeByDish.has(item.id)) throw new Error(`Add a recipe for this dish before billing: ${item.id}.`);
  }

  const orderRef = doc(database, 'orders', id);
  const requestRef = input.sourceRequestId ? doc(database, 'takeaway_requests', input.sourceRequestId) : null;
  const menuRefs = items.map((item) => doc(database, 'menu_items', item.id));
  const recipeRefs = items.map((item) => recipeByDish.get(item.id));
  const settingsRef = doc(database, 'settings', 'restaurant');

  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(orderRef);
    const sourceRequest = requestRef ? await transaction.get(requestRef) : null;
    if (requestRef && (!sourceRequest.exists() || sourceRequest.data().status !== 'pending' || sourceRequest.data().customerUid !== input.customerUid)) {
      throw new Error('This pickup request was already handled. Reload requests.');
    }
    if (existing.exists()) {
      if (existing.data().clientRequestId === id) return { id, ...existing.data() };
      throw new Error('This bill ID is already in use. Reload billing.');
    }
    const [menuSnapshots, recipeSnapshots, settingsSnapshot, posSnapshot, printingSnapshot, templateSnapshot] = await Promise.all([
      Promise.all(menuRefs.map((ref) => transaction.get(ref))),
      Promise.all(recipeRefs.map((ref) => transaction.get(ref))),
      transaction.get(settingsRef),
      transaction.get(doc(database, 'settings', 'pos')),
      transaction.get(doc(database, 'settings', 'printing')),
      transaction.get(doc(database, 'settings', 'receipt_template')),
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
      if (recipe.status === 'draft' || recipe.dishId !== items[index].id || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
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
    const materialById = new Map(materialSnapshots.map((snapshot) => [snapshot.id, snapshot.exists() ? snapshot.data() : {}]));
    billedItems.forEach((item, index) => {
      const recipe = recipeSnapshots[index].data();
      item.costComplete = true;
      item.ingredientCost = money(recipe.ingredients.reduce((sum, ingredient) => {
        const rate = Number(materialById.get(ingredient.id)?.unitCost);
        if (!Number.isFinite(rate) || rate <= 0) item.costComplete = false;
        return sum + (Number.isFinite(rate) && rate > 0 ? Number(ingredient.qty) * item.quantity / Number(recipe.yieldServings) * rate : 0);
      }, 0));
    });
    const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
    const pos = posSnapshot.data() || {};
    if (pos.requireCustomerPhone && !isValidPickupPhone(input.phone || '')) throw new Error('A valid customer phone number is required by POS settings.');
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
    const finance = isFinanceEnabled ? await readRegisterContext(transaction, database) : null;
    const order = {
      id, clientRequestId: id, orderType: input.orderType, table: input.orderType === 'dine_in' ? input.table.trim() : null,
      receiptBusiness: {
        name: settings.name || 'The Bharmals Kitchen', address: settings.address || '',
        phone: settings.phone || '', email: settings.email || '',
        gstin: settings.gstin || '', fssai: settings.fssai || '',
      },
      customer: input.customer?.trim() || 'Walk-in Guest', phone: input.phone?.trim() || null,
      customerUid: input.customerUid || null,
      sourceRequestId: input.sourceRequestId || null,
      notes: input.notes?.trim() || null,
      items: billedItems, ...totals, paymentMethod: input.paymentMethod,
      ingredientCost: money(billedItems.reduce((sum, item) => sum + item.ingredientCost, 0)),
      costComplete: billedItems.every((item) => item.costComplete),
      businessDate: finance?.register.businessDate || businessDate(createdAt),
      shiftId: finance?.shift.id || null,
      paymentEntryId: input.paymentReceived && finance ? `PAY-${id}` : null,
      paymentBusinessDate: input.paymentReceived ? (finance?.register.businessDate || businessDate(createdAt)) : null,
      paymentStatus: input.paymentReceived ? 'paid' : 'pending',
      paidAt: input.paymentReceived ? createdAt : null, status: 'received',
      createdAt, createdBy: input.createdBy || 'POS Staff', createdById: input.createdById || null,
      updatedAt: serverTimestamp(),
    };
    transaction.set(orderRef, order);
    if (requestRef) transaction.update(requestRef, { status: 'accepted', orderId: id, updatedAt: serverTimestamp() });
    const kot = {
      id: `KOT-${id}`, orderId: id, table: order.table || 'Takeaway',
      station: billedItems[0].station || 'Kitchen', items: billedItems.map((item) => `${item.name} (${item.qty})`).join(', '),
      itemsList: billedItems, notes: order.notes, createdAt, status: 'active', updatedAt: serverTimestamp(),
    };
    transaction.set(doc(database, 'kots', `KOT-${id}`), kot);
    for (const job of planPrintJobs(order, kot, printingSnapshot.data(), pos, templateSnapshot.data())) {
      transaction.set(doc(database, 'print_queue', job.id), job);
    }
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
    if (finance) {
      if (input.paymentReceived) writePaymentEntry(transaction, database, finance, {
        id: `PAY-${id}`, referenceId: id, method: input.paymentMethod, amount: totals.total,
        actor: auth?.currentUser || { uid: input.createdById, displayName: input.createdBy },
      });
      else writeRegisterMutation(transaction, database, finance);
    }
    return order;
  });
}

export async function markPosOrderPaidCloud(orderId, paymentMethod, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!['cash', 'upi'].includes(paymentMethod)) throw new Error('Choose Cash or UPI.');
  const orderRef = doc(database, 'orders', orderId);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error('Bill was removed. Reload history.');
    const order = snapshot.data();
    if (order.paymentStatus === 'paid') return;
    if (order.status === 'cancelled') throw new Error('Cancelled bills cannot be marked paid.');
    const finance = isFinanceEnabled ? await readRegisterContext(transaction, database) : null;
    const paidAt = new Date().toISOString();
    transaction.update(orderRef, { paymentStatus: 'paid', paymentMethod, paidAt,
      paymentEntryId: finance ? `PAY-${orderId}` : null,
      paymentBusinessDate: finance?.register.businessDate || businessDate(paidAt),
      paymentShiftId: finance?.shift.id || null, updatedAt: serverTimestamp() });
    if (finance) writePaymentEntry(transaction, database, finance, {
      id: `PAY-${orderId}`, referenceId: orderId, method: paymentMethod, amount: order.total, actor,
    });
  });
}
