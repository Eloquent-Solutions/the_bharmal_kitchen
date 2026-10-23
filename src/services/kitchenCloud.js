import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const allowedTransitions = {
  received: ['cooking', 'cancelled'],
  cooking: ['ready'],
  ready: ['completed'],
};

export async function advanceOrderCloud(orderId, status, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  await runTransaction(database, async (transaction) => {
    const ref = doc(database, 'orders', orderId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Order no longer exists. Reload the queue.');
    const current = snapshot.data().status;
    if (!allowedTransitions[current]?.includes(status)) throw new Error(`Cannot move ${current} order to ${status}. Reload the queue.`);
    transaction.update(ref, {
      status,
      ...(status === 'cooking' ? { cookingStartedAt: new Date().toISOString() } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateKotStatusCloud(kotId, status, database = db) {
  if (!database) throw new Error('Firebase is unavailable.');
  if (status !== 'completed') throw new Error('Unsupported kitchen ticket status.');
  await runTransaction(database, async (transaction) => {
    const ref = doc(database, 'kots', kotId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Kitchen ticket no longer exists. Reload the page.');
    if (snapshot.data().status === 'completed') return;
    transaction.update(ref, { status, updatedAt: serverTimestamp() });
  });
}
