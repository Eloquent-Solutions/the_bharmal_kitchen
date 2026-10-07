import { doc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const roundedStock = (value) => Number(value.toFixed(3));

function quantity(value, { integer = false, allowZero = false } = {}) {
  const number = Number(value);
  if (value === '' || value == null || !Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)
    || (integer && !Number.isInteger(number)) || (!integer && Math.abs(number - roundedStock(number)) > 0.0000001)) {
    throw new Error(integer ? 'Enter a valid whole-number quantity.' : 'Enter a valid quantity with at most three decimal places.');
  }
  return number;
}

function price(value) {
  const number = Number(value);
  if (value === '' || value == null || !Number.isFinite(number) || number < 0) throw new Error('Enter a valid non-negative unit cost.');
  return number;
}

function movement(database, transaction, material, type, qty, source, id = newId('MOV')) {
  transaction.set(doc(database, 'stock_movements', id), {
    id, materialId: material.id, material: material.name, type, qty,
    unit: material.unit, source, user: 'Inventory Staff', date: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

function materialFields(input) {
  return {
    name: input.name.trim(), category: input.category, unit: input.unit,
    reorderLevel: quantity(input.reorderLevel, { allowZero: true }),
    unitCost: price(input.unitCost), supplier: input.supplier || '',
  };
}

export async function saveRawMaterialCloud(input, original = null, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!input.name?.trim()) throw new Error('Material name is required.');
  const fields = materialFields(input);
  const id = original?.id || input.id || newId('RM');
  const ref = doc(database, 'raw_materials', id);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (original) {
      if (!snapshot.exists()) throw new Error('Material was removed. Reload inventory.');
      const current = snapshot.data();
      if (fields.unit !== current.unit && Number(current.currentStock) > 0) {
        throw new Error('Reconcile stock to zero before changing its unit.');
      }
      if (Number(fields.unitCost) === Number(original.unitCost)) {
        fields.unitCost = Number(current.unitCost || 0);
      } else if (Number(current.unitCost) !== Number(original.unitCost)) {
        throw new Error('Unit cost changed since editing began. Reload inventory and try again.');
      }
      transaction.update(ref, { ...fields, updatedAt: serverTimestamp() });
    } else {
      if (snapshot.exists()) {
        if (input.id && snapshot.data().name === fields.name) return;
        throw new Error('Material ID already exists. Try again.');
      }
      const opening = quantity(input.currentStock, { allowZero: true });
      const material = { id, ...fields, currentStock: opening };
      transaction.set(ref, { ...material, updatedAt: serverTimestamp() });
      if (opening > 0) movement(database, transaction, material, 'inward', opening, 'Opening Stock');
    }
  });
  return id;
}

export async function adjustRawMaterialStockCloud(id, value, type, source, inwardUnitCost = null, database = db, operationId = newId('MOV')) {
  if (!database) throw new Error('Firebase is unavailable.');
  const qty = quantity(value);
  if (!['add', 'subtract'].includes(type)) throw new Error('Invalid stock movement type.');
  const cost = inwardUnitCost == null ? null : price(inwardUnitCost);
  const ref = doc(database, 'raw_materials', id);
  const movementId = operationId || newId('MOV');
  const movementRef = doc(database, 'stock_movements', movementId);
  await runTransaction(database, async (transaction) => {
    const [snapshot, existingMovement] = await Promise.all([transaction.get(ref), transaction.get(movementRef)]);
    if (existingMovement.exists()) {
      const previous = existingMovement.data();
      if (previous.materialId === id && previous.qty === qty && previous.type === (type === 'add' ? 'inward' : 'outward')) return;
      throw new Error('This stock operation ID was already used. Reload inventory.');
    }
    if (!snapshot.exists()) throw new Error('Material was removed. Reload inventory.');
    const current = { id, ...snapshot.data() };
    const before = Number(current.currentStock) || 0;
    if (type === 'subtract' && qty > before) throw new Error(`Only ${before} ${current.unit} of ${current.name} is available.`);
    const after = roundedStock(before + (type === 'add' ? qty : -qty));
    const unitCost = type === 'add' && cost != null && after > 0
      ? Number(((before * Number(current.unitCost || 0) + qty * cost) / after).toFixed(2))
      : Number(current.unitCost || 0);
    transaction.update(ref, { currentStock: after, unitCost, updatedAt: serverTimestamp() });
    movement(database, transaction, current, type === 'add' ? 'inward' : 'outward', qty, source, movementId);
  });
}

export async function reconcilePhysicalStockCloud(items, reason = 'Periodic Stock Audit', database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (items.length > 200) throw new Error('Count at most 200 materials at a time.');
  const prepared = items.map((item) => ({ ...item, counted: quantity(item.countedStock, { allowZero: true }), ref: doc(database, 'raw_materials', item.id) }));
  await runTransaction(database, async (transaction) => {
    const snapshots = await Promise.all(prepared.map((item) => transaction.get(item.ref)));
    prepared.forEach((item, index) => {
      const snapshot = snapshots[index];
      if (!snapshot.exists()) throw new Error(`${item.name} was removed. Reload the count.`);
      const current = { id: item.id, ...snapshot.data() };
      const before = Number(current.currentStock) || 0;
      if (Math.abs(before - Number(item.systemStock)) > 0.000001) {
        throw new Error(`${current.name} changed since this count was opened. Reload the count and try again.`);
      }
      const variance = roundedStock(item.counted - before);
      if (variance === 0) return;
      transaction.update(item.ref, { currentStock: item.counted, updatedAt: serverTimestamp() });
      movement(database, transaction, current, variance > 0 ? 'inward' : 'outward', Math.abs(variance), `Stock Count Reconciliation (${reason})`);
    });
  });
}

export async function saveWastageCloud(input, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  const qty = quantity(input.qty);
  const id = input.id || newId('WST');
  const materialRef = doc(database, 'raw_materials', input.materialId);
  const logRef = doc(database, 'wastage', id);
  await runTransaction(database, async (transaction) => {
    const [snapshot, existingLog] = await Promise.all([transaction.get(materialRef), transaction.get(logRef)]);
    if (existingLog.exists()) {
      const previous = existingLog.data();
      if (previous.materialId === input.materialId && previous.qty === qty && previous.reason === (input.reason || '')) return;
      throw new Error('This wastage ID was already used. Reload inventory.');
    }
    if (!snapshot.exists()) throw new Error('Select a raw material from inventory.');
    const material = { id: input.materialId, ...snapshot.data() };
    const before = Number(material.currentStock) || 0;
    if (qty > before) throw new Error(`Only ${before} ${material.unit} of ${material.name} is available.`);
    const log = {
      id, materialId: material.id, material: material.name, unit: material.unit,
      qty, reason: input.reason || '', date: new Date().toISOString().slice(0, 10),
      cost: Number((qty * Number(material.unitCost || 0)).toFixed(2)),
      loggedBy: input.loggedBy || 'Inventory Staff', updatedAt: serverTimestamp(),
    };
    transaction.update(materialRef, { currentStock: roundedStock(before - qty), updatedAt: serverTimestamp() });
    transaction.set(logRef, log);
    movement(database, transaction, material, 'outward', qty, `Kitchen Wastage #${id} (${log.reason})`);
  });
  return id;
}

export async function savePurchaseBillCloud(input, original = null, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!input.supplier || !Array.isArray(input.items) || input.items.length === 0) throw new Error('Supplier and bill items are required.');
  const id = original?.id || input.id || newId('BILL');
  const billRef = doc(database, 'purchase_bills', id);
  const lines = input.items.map((item) => {
    if (!['raw_material', 'utensil'].includes(item.type) || !item.itemId) throw new Error('Select an existing inventory item.');
    const qty = quantity(item.qty, { integer: item.type === 'utensil' });
    const unitCost = price(item.unitCost);
    return { ...item, qty, unitCost, total: Number((qty * unitCost).toFixed(2)) };
  });
  const subtotal = Number(lines.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const tax = price(input.gstAmount ?? 0);
  const billTotal = Number((subtotal + tax).toFixed(2));
  const refs = [...new Map(lines.map((line) => [`${line.type}:${line.itemId}`, {
    key: `${line.type}:${line.itemId}`, type: line.type, ref: doc(database, line.type === 'utensil' ? 'utensils' : 'raw_materials', line.itemId),
  }])).values()];
  await runTransaction(database, async (transaction) => {
    const billSnapshot = await transaction.get(billRef);
    if (original) {
      if (!billSnapshot.exists()) throw new Error('Bill was removed. Reload purchasing.');
      if (input.paymentStatus !== 'paid') throw new Error('Received bills cannot be edited. Record a stock correction instead.');
      transaction.update(billRef, { paymentStatus: 'paid', updatedAt: serverTimestamp() });
      return;
    }
    if (billSnapshot.exists()) {
      const existing = billSnapshot.data();
      if (existing.invoiceNumber === input.invoiceNumber && existing.supplier === input.supplier
        && Number(existing.gstAmount || 0) === tax && JSON.stringify(existing.items) === JSON.stringify(lines)) return;
      throw new Error('Bill ID already exists with different details. Reload purchasing.');
    }
    const snapshots = await Promise.all(refs.map(({ ref }) => transaction.get(ref)));
    for (const [index, entry] of refs.entries()) {
      const snapshot = snapshots[index];
      if (!snapshot.exists()) throw new Error('A bill item was removed. Reload purchasing.');
      const matching = lines.filter((line) => `${line.type}:${line.itemId}` === entry.key);
      const before = entry.type === 'utensil' ? Number(snapshot.data().totalQty) || 0 : Number(snapshot.data().currentStock) || 0;
      const received = matching.reduce((sum, line) => sum + line.qty, 0);
      if (entry.type === 'utensil') {
        transaction.update(entry.ref, { totalQty: before + received, updatedAt: serverTimestamp() });
      } else {
        const current = { id: snapshot.id, ...snapshot.data() };
        const cost = matching.reduce((sum, line) => sum + line.qty * line.unitCost, 0);
        const after = roundedStock(before + received);
        const unitCost = Number(((before * Number(current.unitCost || 0) + cost) / after).toFixed(2));
        transaction.update(entry.ref, { currentStock: after, unitCost, updatedAt: serverTimestamp() });
        movement(database, transaction, current, 'inward', received, `Purchase Bill #${input.invoiceNumber || id}`);
      }
    }
    transaction.set(billRef, {
      ...input, id, items: lines, billDate: input.billDate || new Date().toISOString().slice(0, 10),
      paymentStatus: input.paymentStatus || 'pending', taxableAmount: subtotal, gstAmount: tax, totalAmount: billTotal,
      updatedAt: serverTimestamp(),
    });
  });
  return id;
}

export async function saveUtensilCloud(input, original = null, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  const totalQty = quantity(input.totalQty, { integer: true, allowZero: true });
  const inUse = quantity(input.inUse, { integer: true, allowZero: true });
  const inCleaning = quantity(input.inCleaning, { integer: true, allowZero: true });
  if (inUse + inCleaning > totalQty) throw new Error('Active use plus cleaning cannot exceed total owned.');
  const id = original?.id || input.id || newId('UTN');
  const ref = doc(database, 'utensils', id);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (original) {
      if (!snapshot.exists()) throw new Error('Utensil was removed. Reload inventory.');
      if (Number(snapshot.data().totalQty) !== Number(original.totalQty)) throw new Error('Utensil quantity changed. Reload inventory and try again.');
    } else if (snapshot.exists()) {
      if (input.id && snapshot.data().name === input.name) return;
      throw new Error('Utensil ID already exists. Try again.');
    }
    transaction.set(ref, {
      ...(snapshot.exists() ? snapshot.data() : {}), ...input, id, totalQty, inUse, inCleaning,
      unitCost: price(input.unitCost), updatedAt: serverTimestamp(),
    });
  });
  return id;
}

export async function saveSupplierCloud(input, original = null, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  const id = original?.id || input.id || newId('SUP');
  await setDoc(doc(database, 'suppliers', id), { ...input, id, updatedAt: serverTimestamp() }, { merge: true });
  return id;
}

export async function saveUserAccessCloud(input, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (!input.id) throw new Error('Ask the staff member to sign in before assigning access.');
  const ref = doc(database, 'users', input.id);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This account was not found. Reload users.');
    const current = snapshot.data();
    if (current.email !== input.email) throw new Error('The sign-in email cannot be changed here.');
    if (input.id === auth?.currentUser?.uid && (input.role !== 'Owner' || input.status !== 'active')) {
      throw new Error('The signed-in owner cannot remove their own access.');
    }
    transaction.update(ref, {
      name: input.name, role: input.role, status: input.status,
      allowedTabs: input.allowedTabs, updatedAt: serverTimestamp(),
    });
  });
}
