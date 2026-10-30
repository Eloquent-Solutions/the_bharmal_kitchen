import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { publicRestaurant, RESTAURANT_DEFAULTS, validateSettings } from '../utils/settings';

export function auditWrite(transaction, database, actor, action, target) {
  if (!actor?.uid) throw new Error('Sign in before saving changes.');
  const id = crypto.randomUUID();
  transaction.set(doc(database, 'audit_logs', id), { id, actorId: actor.uid, actor: actor.displayName || actor.email || actor.uid, action, target, createdAt: new Date().toISOString(), updatedAt: serverTimestamp() });
}
export async function saveSettingsCloud(id, input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Connect to the development database to save settings.');
  const patch = validateSettings(id, input);
  return runTransaction(database, async (transaction) => {
    const ref = doc(database, 'settings', id);
    const snapshot = await transaction.get(ref);
    const next = { ...(id === 'restaurant' ? RESTAURANT_DEFAULTS : {}), ...(snapshot.data() || {}), ...patch };
    transaction.set(ref, { ...next, updatedAt: serverTimestamp() });
    if (id === 'restaurant') transaction.set(doc(database, 'public_settings', 'restaurant'), publicRestaurant(next));
    auditWrite(transaction, database, actor, `Updated ${id} settings`, `settings/${id}`);
    return next;
  });
}
export async function saveBranchCloud(input, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Database unavailable.');
  const id = input.id || `BR-${crypto.randomUUID()}`;
  const name = String(input.name || '').trim(); const address = String(input.address || '').trim();
  if (!name || !address || name.length > 100 || address.length > 600) throw new Error('Enter a branch name and address.');
  await runTransaction(database, async (transaction) => {
    transaction.set(doc(database, 'branches', id), { id, name, address, phone: String(input.phone || '').trim().slice(0, 30), active: input.active !== false, updatedAt: serverTimestamp() });
    auditWrite(transaction, database, actor, 'Updated branch contact', `branches/${id}`);
  });
}
