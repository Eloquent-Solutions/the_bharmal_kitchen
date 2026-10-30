import { collection, doc, getDoc, onSnapshot, query, runTransaction, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { placePosOrderCloud } from './billingCloud';
import { isValidPickupPhone } from '../utils/phone';

export async function createTakeawayRequest({ customer, phone, items, notes = '' }, database = db, currentUser = auth?.currentUser) {
  if (!database || !currentUser) throw new Error('Sign in with Google before requesting pickup.');
  const cleanItems = items.map((item) => ({ dishId: String(item.id), qty: Number(item.quantity ?? item.qty) }));
  if (!customer.trim() || !isValidPickupPhone(phone)) throw new Error('Enter your name and a valid phone number.');
  if (!cleanItems.length || cleanItems.length > 20 || cleanItems.some((item) => !item.dishId || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20)) {
    throw new Error('Choose up to 20 dishes with a valid quantity.');
  }
  const id = `REQ-${crypto.randomUUID()}`;
  const request = {
    id, customerUid: currentUser.uid, customer: customer.trim().slice(0, 100), phone: phone.trim(),
    items: cleanItems, notes: notes.trim().slice(0, 500), orderType: 'takeaway', paymentMethod: 'cash',
    paymentStatus: 'pending', status: 'pending', createdAt: new Date().toISOString(),
  };
  await runTransaction(database, async (transaction) => {
    const profile = await transaction.get(doc(database, 'public_settings', 'restaurant'));
    if (profile.data()?.isOpen === false) throw new Error('Pickup requests are currently paused.');
    transaction.set(doc(database, 'takeaway_requests', id), request);
  });
  return request;
}

export function watchTakeawayRequest(id, onChange, onError, database = db) {
  return onSnapshot(doc(database, 'takeaway_requests', id), (snapshot) => {
    onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
}

export function watchCustomerTakeawayRequests(customerUid, onChange, onError, database = db) {
  return onSnapshot(query(collection(database, 'takeaway_requests'), where('customerUid', '==', customerUid)),
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))), onError);
}

export function watchPendingTakeawayRequests(onChange, onError, database = db) {
  return onSnapshot(query(collection(database, 'takeaway_requests'), where('status', '==', 'pending')),
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))), onError);
}

export async function acceptTakeawayRequest(id, staffUser, database = db) {
  if (!database || !staffUser) throw new Error('Staff sign-in is required.');
  const requestRef = doc(database, 'takeaway_requests', id);
  const snapshot = await getDoc(requestRef);
  if (!snapshot.exists()) throw new Error('Pickup request no longer exists.');
  const request = snapshot.data();
  if (request.status !== 'pending') throw new Error('This pickup request was already handled.');
  const menuSnapshots = await Promise.all(request.items.map((item) => getDoc(doc(database, 'menu_items', item.dishId))));
  const items = request.items.map((item, index) => {
    if (!menuSnapshots[index].exists() || menuSnapshots[index].data().isAvailable === false) throw new Error('A requested dish is unavailable. Contact the customer.');
    return { id: item.dishId, quantity: item.qty, price: Number(menuSnapshots[index].data().price) };
  });
  const orderId = `TBK-${id}`;
  const order = await placePosOrderCloud({
    id: orderId, items, orderType: 'takeaway', paymentMethod: 'cash', paymentReceived: false,
    customer: request.customer, phone: request.phone, customerUid: request.customerUid,
    sourceRequestId: id, notes: request.notes,
    createdBy: staffUser.displayName || staffUser.email || 'Staff', createdById: staffUser.uid,
  }, database);
  return order;
}

export async function declineTakeawayRequest(id, database = db) {
  const ref = doc(database, 'takeaway_requests', id);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('This pickup request was already handled.');
    transaction.update(ref, { status: 'declined', updatedAt: serverTimestamp() });
  });
}
