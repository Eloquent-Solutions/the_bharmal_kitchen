import { collection, doc, getDocFromServer, getDocsFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { businessDate, validBusinessDate, expectedShiftCash, buildFinanceReport, money } from '../utils/finance';

export const FINANCE_WRITERS = ['Owner', 'Admin', 'Manager'];
export const FINANCE_READERS = [...FINANCE_WRITERS, 'Accountant'];
const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const actorOf = (actor = auth?.currentUser) => {
  if (!actor?.uid) throw new Error('Staff sign-in is required.');
  return { createdById: actor.uid, createdBy: actor.displayName || actor.email || 'Staff' };
};
const amountOf = (value, allowZero = false) => {
  const amount = Number(value);
  if (value === '' || value == null || !Number.isFinite(amount) || amount < 0 || (!allowZero && money(amount) <= 0) || amount > 1e9) {
    throw new Error(allowZero ? 'Enter a valid cash amount of zero or more.' : 'Enter a positive amount.');
  }
  return money(amount);
};

// Billing, supplier payments and finance entries read the same register and shift.
// Closing a shift conflicts with an in-flight payment instead of losing its cash.
export async function readRegisterContext(transaction, database) {
  const registerRef = doc(database, 'finance_registers', 'main');
  const registerSnapshot = await transaction.get(registerRef);
  const register = registerSnapshot.exists() ? registerSnapshot.data() : {};
  if (!register.activeShiftId) throw new Error('Open a register shift in Finance → Shifts before recording bills or payments.');
  const shiftRef = doc(database, 'shifts', register.activeShiftId);
  const snapshot = await transaction.get(shiftRef);
  if (!snapshot.exists() || snapshot.data().status !== 'open' || snapshot.data().businessDate !== register.businessDate) {
    throw new Error('The register shift changed. Reload Finance → Shifts.');
  }
  return { registerRef, register, shiftRef, shift: snapshot.data() };
}

export function writeRegisterMutation(transaction, database, context, deltas = {}, entry = null) {
  const updates = {};
  for (const [key, value] of Object.entries(deltas)) updates[key] = money(Number(context.shift[key] || 0) + Number(value));
  if (expectedShiftCash({ ...context.shift, ...updates }) < 0) throw new Error('Not enough cash in the drawer. Record a real top-up or check the payment method.');
  transaction.update(context.shiftRef, { ...updates, updatedAt: serverTimestamp() });
  transaction.update(context.registerRef, { revision: Number(context.register.revision || 0) + 1, updatedAt: serverTimestamp() });
  if (entry) transaction.set(doc(database, 'finance_entries', entry.id), {
    ...entry, shiftId: context.shift.id, businessDate: context.register.businessDate,
    createdAt: new Date().toISOString(), updatedAt: serverTimestamp(),
  });
}

export function writePaymentEntry(transaction, database, context, { id, referenceId, kind = 'sale', method, amount, actor }) {
  if (!['cash', 'upi', 'bank'].includes(method)) throw new Error('Choose Cash, UPI, or Bank for this payment.');
  const value = amountOf(amount);
  const supplier = kind === 'supplier_payment';
  const deltas = supplier ? (method === 'cash' ? { supplierCash: value } : {})
    : { [method === 'cash' ? 'cashSales' : 'upiSales']: value };
  writeRegisterMutation(transaction, database, context, deltas, {
    id, referenceId, kind, method, amount: value, direction: supplier ? 'out' : 'in',
    reason: supplier ? `Supplier invoice ${referenceId}` : `Bill ${referenceId}`, ...actorOf(actor),
  });
}

export async function openRegisterShift(input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Finance requires a Firebase development or production project.');
  const who = actorOf(actor);
  const date = input.businessDate || businessDate();
  if (!validBusinessDate(date) || date > businessDate()) throw new Error('Choose a valid business date no later than today in Rajkot.');
  if (!input.shiftName?.trim()) throw new Error('Enter a register shift name.');
  const openingCash = amountOf(input.openingCash, true);
  const id = input.id || newId('SHF');
  return runTransaction(database, async (transaction) => {
    const registerRef = doc(database, 'finance_registers', 'main');
    const shiftRef = doc(database, 'shifts', id);
    const [registerSnapshot, existing] = await Promise.all([transaction.get(registerRef), transaction.get(shiftRef)]);
    if (existing.exists()) {
      const saved = existing.data();
      if (saved.openingCash !== openingCash || saved.businessDate !== date || saved.shiftName !== input.shiftName.trim() || saved.createdById !== who.createdById) {
        throw new Error('This shift attempt was already saved with different values. Reload the shift.');
      }
      return saved;
    }
    const register = registerSnapshot.exists() ? registerSnapshot.data() : {};
    if (register.activeShiftId) throw new Error('A register shift is already open. Close it before opening another.');
    if (register.lastClosedDate && date <= register.lastClosedDate) throw new Error('This business day is already closed.');
    if (register.businessDate && register.businessDate !== date) throw new Error(`Close business day ${register.businessDate} before starting another date.`);
    const shift = { id, schemaVersion: 2, shiftName: input.shiftName.trim().slice(0, 100), businessDate: date,
      openingCash, cashSales: 0, upiSales: 0, cashIn: 0, cashOut: 0, cashExpenses: 0, supplierCash: 0,
      status: 'open', openedAt: new Date().toISOString(), ...who };
    transaction.set(shiftRef, { ...shift, updatedAt: serverTimestamp() });
    transaction.set(registerRef, { ...register, activeShiftId: id, businessDate: date,
      revision: Number(register.revision || 0) + 1, updatedAt: serverTimestamp() });
    return shift;
  });
}

export async function closeRegisterShift(input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Firebase is unavailable.');
  const who = actorOf(actor);
  const actualCash = amountOf(input.actualCash, true);
  return runTransaction(database, async (transaction) => {
    const existing = await transaction.get(doc(database, 'shifts', input.id));
    if (!existing.exists()) throw new Error('Register shift was removed.');
    if (existing.data().status === 'closed') {
      if (existing.data().actualCash !== actualCash) throw new Error('This shift is already closed with a different count. Reload the shift.');
      return existing.data();
    }
    const context = await readRegisterContext(transaction, database);
    if (context.shift.id !== input.id) throw new Error('The active shift changed. Reload and count again.');
    const expectedCash = expectedShiftCash(context.shift);
    const variance = money(actualCash - expectedCash);
    if (variance !== 0 && !input.note?.trim()) throw new Error('Enter a reason for the cash difference.');
    const closed = { status: 'closed', expectedCash, actualCash, variance, note: input.note?.trim().slice(0, 500) || '',
      closedAt: new Date().toISOString(), closedById: who.createdById, closedBy: who.createdBy };
    transaction.update(context.shiftRef, { ...closed, updatedAt: serverTimestamp() });
    transaction.update(context.registerRef, { activeShiftId: null, revision: Number(context.register.revision || 0) + 1, updatedAt: serverTimestamp() });
    return { ...context.shift, ...closed };
  });
}

export async function recordFinanceExpense(input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Firebase is unavailable.');
  const who = actorOf(actor);
  const amount = amountOf(input.amount);
  if (!input.title?.trim() || !input.category?.trim()) throw new Error('Enter an expense description and category.');
  if (!['cash', 'upi', 'bank'].includes(input.method)) throw new Error('Choose the actual expense payment method.');
  const id = input.id || newId('EXP');
  return runTransaction(database, async (transaction) => {
    const ref = doc(database, 'expenses', id);
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      const saved = existing.data();
      if (saved.amount !== amount || saved.method !== input.method || saved.title !== input.title.trim() || saved.category !== input.category || saved.createdById !== who.createdById) {
        throw new Error('This expense attempt was already saved with different values. Reload expenses.');
      }
      return saved;
    }
    const context = await readRegisterContext(transaction, database);
    const expense = { id, schemaVersion: 2, title: input.title.trim().slice(0, 200), category: input.category,
      method: input.method, amount, reference: input.reference?.trim().slice(0, 100) || '', status: 'posted',
      shiftId: context.shift.id, businessDate: context.register.businessDate, date: context.register.businessDate,
      createdAt: new Date().toISOString(), ...who };
    transaction.set(ref, { ...expense, updatedAt: serverTimestamp() });
    writeRegisterMutation(transaction, database, context, input.method === 'cash' ? { cashExpenses: amount } : {}, {
      id: `EXP-${id}`, kind: 'expense', referenceId: id, method: input.method, direction: 'out', amount,
      reason: expense.title, ...who,
    });
    return expense;
  });
}

export async function voidFinanceExpense(id, reason, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Firebase is unavailable.');
  const who = actorOf(actor);
  if (!reason?.trim()) throw new Error('Enter a reason for reversing this expense.');
  await runTransaction(database, async (transaction) => {
    const ref = doc(database, 'expenses', id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Expense no longer exists.');
    const expense = snapshot.data();
    if (expense.status === 'void') return;
    const context = await readRegisterContext(transaction, database);
    if (expense.shiftId !== context.shift.id) throw new Error('Only expenses in the active shift can be reversed. Closed records are retained for audit.');
    transaction.update(ref, { status: 'void', voidReason: reason.trim().slice(0, 500), voidedAt: new Date().toISOString(),
      voidedById: who.createdById, updatedAt: serverTimestamp() });
    writeRegisterMutation(transaction, database, context, expense.method === 'cash' ? { cashExpenses: -expense.amount } : {}, {
      id: `VOID-${id}`, kind: 'expense_reversal', referenceId: id, method: expense.method, direction: 'in',
      amount: expense.amount, reason: reason.trim().slice(0, 500), ...who,
    });
  });
}

export async function recordCashMovement(input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Firebase is unavailable.');
  const who = actorOf(actor);
  const amount = amountOf(input.amount);
  if (!['in', 'out'].includes(input.direction) || !input.reason?.trim()) throw new Error('Choose cash in or out and enter a reason.');
  const id = input.id || newId('CASH');
  await runTransaction(database, async (transaction) => {
    const existing = await transaction.get(doc(database, 'finance_entries', id));
    if (existing.exists()) {
      const saved = existing.data();
      if (saved.amount !== amount || saved.direction !== input.direction || saved.reason !== input.reason.trim() || saved.createdById !== who.createdById) {
        throw new Error('This cash movement was already saved with different values. Reload the ledger.');
      }
      return;
    }
    const context = await readRegisterContext(transaction, database);
    writeRegisterMutation(transaction, database, context, { [input.direction === 'in' ? 'cashIn' : 'cashOut']: amount }, {
      id, kind: 'transfer', direction: input.direction, method: 'cash', amount, referenceId: id,
      reason: input.reason.trim().slice(0, 500), ...who,
    });
  });
  return id;
}

export async function closeBusinessDay({ date, acknowledgeUnpaid = false }, database = db, actor = auth?.currentUser) {
  if (!database || !validBusinessDate(date)) throw new Error('Choose a valid business day.');
  const who = actorOf(actor);
  const ref = doc(database, 'day_close', date);
  const existing = await getDocFromServer(ref);
  if (existing.exists()) return existing.data();
  const registerRef = doc(database, 'finance_registers', 'main');
  const before = await getDocFromServer(registerRef);
  const register = before.exists() ? before.data() : {};
  if (register.businessDate !== date || register.activeShiftId) throw new Error('Close every register shift for this business day first.');
  const names = ['orders', 'expenses', 'finance_entries', 'shifts'];
  const snapshots = await Promise.all(names.map((name) => getDocsFromServer(collection(database, name))));
  const data = Object.fromEntries(names.map((name, index) => [name === 'finance_entries' ? 'entries' : name,
    snapshots[index].docs.map((entry) => ({ id: entry.id, ...entry.data() }))]));
  const report = buildFinanceReport(data, date, date);
  const shifts = data.shifts.filter((shift) => shift.businessDate === date && shift.schemaVersion === 2);
  if (!shifts.length || shifts.some((shift) => shift.status !== 'closed')) throw new Error('Close all register shifts first.');
  if (report.outstanding > 0 && !acknowledgeUnpaid) throw new Error('Confirm that unpaid bills will carry forward.');
  return runTransaction(database, async (transaction) => {
    const [current, closed] = await Promise.all([transaction.get(registerRef), transaction.get(ref)]);
    if (closed.exists()) return closed.data();
    if (!current.exists() || current.data().revision !== register.revision || current.data().activeShiftId
      || current.data().businessDate !== date) throw new Error('Finance records changed while closing. Refresh the summary and try again.');
    const record = { id: date, schemaVersion: 2, businessDate: date, grossSales: report.grossSales,
      netSales: report.netSales, cgst: report.cgst, sgst: report.sgst, totalOrders: report.orders.length,
      collected: report.collected, paymentMix: report.byMethod, outstanding: report.outstanding,
      expenses: report.expenseTotal, ingredientCost: report.ingredientCost, missingCost: report.missingCost,
      missingTax: report.missingTax,
      shifts: shifts.map(({ id, shiftName, openingCash, expectedCash, actualCash, variance }) => ({ id, shiftName, openingCash, expectedCash, actualCash, variance })),
      variance: money(shifts.reduce((sum, shift) => sum + Number(shift.variance || 0), 0)),
      legacyPayments: report.payments.filter((payment) => payment.legacy).length,
      acknowledgeUnpaid, closedAt: new Date().toISOString(), ...who };
    transaction.set(ref, { ...record, updatedAt: serverTimestamp() });
    transaction.update(registerRef, { businessDate: null, lastClosedDate: date,
      revision: Number(register.revision || 0) + 1, updatedAt: serverTimestamp() });
    return record;
  });
}
