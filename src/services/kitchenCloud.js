import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, isFinanceEnabled } from '../firebase/config';
import { readRegisterContext, writeRegisterMutation } from './financeCloud';

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
    let finance = null;
    if (status === 'cancelled' && isFinanceEnabled) {
      if (snapshot.data().paymentStatus === 'paid') throw new Error('A paid bill needs a recorded refund before cancellation. Contact the owner.');
      finance = await readRegisterContext(transaction, database);
      if (snapshot.data().businessDate && snapshot.data().businessDate !== finance.register.businessDate) {
        throw new Error('This bill belongs to a closed business day. Contact the owner.');
      }
    }
    transaction.update(ref, {
      status,
      ...(status === 'cooking' ? { cookingStartedAt: new Date().toISOString() } : {}),
      updatedAt: serverTimestamp(),
    });
    if (finance) writeRegisterMutation(transaction, database, finance);
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
