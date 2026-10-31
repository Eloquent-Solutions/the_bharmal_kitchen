import { collection, doc, runTransaction } from 'firebase/firestore';
import { restaurantRuntime } from './config';
import { assertRestaurantId } from '../tenancy/identity';
import { scopedCollectionName } from '../tenancy/collections';

// Immutable handles allow the same Firestore connection to serve two restaurants
// without a mutable global "current tenant" or leaking an async transaction's scope.
const scopeMarker = Symbol('restaurant database');
export function forRestaurant(firestore, restaurantId) {
  if (!firestore) throw new Error('Firebase is unavailable.');
  return Object.freeze({ [scopeMarker]: true, firestore: rawFirestore(firestore), restaurantId: assertRestaurantId(restaurantId) });
}
export function rawFirestore(database) { return database?.[scopeMarker] ? database.firestore : database; }
export function restaurantIdFor(database) {
  if (database?.[scopeMarker]) return database.restaurantId;
  if (restaurantRuntime.mode === 'legacy') return null;
  if (restaurantRuntime.mode !== 'restaurant') throw new Error('Open a valid restaurant address before accessing business records.');
  return restaurantRuntime.restaurantId;
}
function segments(database, name) {
  const restaurantId = restaurantIdFor(database);
  return restaurantId ? ['restaurants', restaurantId, scopedCollectionName(name)] : [name];
}
export function restaurantCollection(database, name) { return collection(rawFirestore(database), ...segments(database, name)); }
export function restaurantRegistryDoc(database) {
  const id = restaurantIdFor(database);
  return id ? doc(rawFirestore(database), 'restaurants', id) : null;
}
export function restaurantDoc(database, name, id) {
  if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..') throw new Error('Invalid document identifier.');
  return doc(rawFirestore(database), ...segments(database, name), id);
}
export function restaurantTransaction(database, callback, options) { return runTransaction(rawFirestore(database), callback, options); }
