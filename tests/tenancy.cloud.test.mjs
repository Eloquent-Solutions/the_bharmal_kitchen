import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { readLegacySnapshot, migrationPlan, applyMigration, normalizeLegacyRestaurantSettings } from '../scripts/tenancy/copyRestaurant.mjs';
import { firebaseTransport } from '../scripts/tenancy/firebaseTransport.mjs';
let environment, vite, scope, billing, finance, inventory, settings, drafts, takeaway;
const project = 'demo-tbk-tenancy';
const actor = (uid) => ({ uid, displayName: uid });
const as = (uid) => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const scoped = (uid, restaurantId) => scope.forRestaurant(as(uid), restaurantId);
const member = (uid, role, restaurantId) => ({ uid, id: uid, name: uid, email: `${uid}@example.test`, role, status: 'active', allowedTabs: [], restaurantId });
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST); process.env.VITE_DATA_MODE = 'demo'; process.env.VITE_BILLING_ENABLED = 'true'; process.env.VITE_FINANCE_ENABLED = 'true';
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId: project, firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') } });
  vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  [scope, billing, finance, inventory, settings, drafts, takeaway] = await Promise.all(['/src/firebase/restaurantDb.js', '/src/services/billingCloud.js', '/src/services/financeCloud.js', '/src/services/inventoryCloud.js', '/src/services/settingsCloud.js', '/src/services/recipeDraftsCloud.js', '/src/services/takeawayCloud.js'].map((file) => vite.ssrLoadModule(file)));
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'legacy-owner'), member('legacy-owner', 'Owner', 'legacy'));
    for (const restaurantId of ['tbk', 'cafe-two']) {
      await setDoc(doc(db, 'restaurants', restaurantId), { slug: restaurantId, name: restaurantId, status: 'active' });
      const base = (name, id) => doc(db, 'restaurants', restaurantId, name, id);
      const owner = restaurantId === 'tbk' ? 'owner-a' : 'owner-b';
      await setDoc(base('members', owner), member(owner, 'Owner', restaurantId));
      await setDoc(base('members', 'dual'), member('dual', restaurantId === 'tbk' ? 'Manager' : 'Accountant', restaurantId));
      await setDoc(base('members', 'customer'), member('customer', 'Customer', restaurantId));
      await setDoc(base('settings', 'restaurant'), { name: restaurantId, address: 'Test road', cgstRate: 2.5, sgstRate: 2.5, serviceCharge: 0, roundOff: false });
      await setDoc(base('public_settings', 'restaurant'), { name: restaurantId, address: 'Test road', phone: '', googleMapUrl: '', isOpen: true });
      await setDoc(base('raw_materials', 'rice'), { id: 'rice', name: 'Rice', unit: 'kg', currentStock: 10, unitCost: 50 });
      await setDoc(base('menu_items', 'dish'), { id: 'dish', name: 'Dish', isAvailable: true, price: 100, station: 'Kitchen' });
      await setDoc(base('recipes', 'recipe'), { id: 'recipe', dishId: 'dish', yieldServings: 1, ingredients: [{ id: 'rice', name: 'Rice', qty: 0.1, unit: 'kg' }] });
      await setDoc(base('orders', 'private'), { id: 'private', customerUid: 'customer', status: 'received', total: 105, paymentStatus: 'pending' });
    }
  });
});
after(async () => { await vite?.close(); await environment?.cleanup(); });
test('restaurant owners cannot read, query, or alter another restaurant or provision platform records', async () => {
  const a = as('owner-a'); const b = as('owner-b');
  await assertSucceeds(getDoc(scope.restaurantDoc(scope.forRestaurant(a, 'tbk'), 'raw_materials', 'rice')));
  for (const database of [a, as('legacy-owner'), environment.unauthenticatedContext().firestore()]) {
    await assertFails(getDoc(doc(database, 'restaurants', 'cafe-two', 'raw_materials', 'rice')));
    await assertFails(getDocs(collection(database, 'restaurants', 'cafe-two', 'orders')));
    await assertFails(updateDoc(doc(database, 'restaurants', 'cafe-two', 'settings', 'restaurant'), { name: 'Intrusion' }));
    await assertFails(setDoc(doc(database, 'restaurants', 'new-restaurant'), { slug: 'new-restaurant', status: 'active' }));
    await assertFails(setDoc(doc(database, 'platform_admins', 'owner-a'), { role: 'SuperAdmin' }));
  }
  await assertFails(getDoc(doc(b, 'restaurants', 'tbk', 'members', 'owner-a')));
  await assertFails(getDocs(collectionGroup(a, 'orders')));
});
test('customer self-enrolment is local and cannot grant staff access or custom privileges', async () => {
  const db = as('new-customer'); const ref = doc(db, 'restaurants', 'tbk', 'members', 'new-customer');
  const profile = member('new-customer', 'Customer', 'tbk');
  await assertFails(setDoc(ref, { ...profile, role: 'Owner' }));
  await assertFails(setDoc(ref, { ...profile, restaurantId: 'cafe-two' }));
  await assertFails(setDoc(ref, { ...profile, permissions: ['manage_users'] }));
  await assertSucceeds(setDoc(ref, profile));
  await assertFails(updateDoc(ref, { role: 'Owner' }));
  await assertFails(getDoc(doc(db, 'restaurants', 'cafe-two', 'raw_materials', 'rice')));
});
test('a single user has different effective permissions in each restaurant', async () => {
  const a = scoped('dual', 'tbk'); const b = scoped('dual', 'cafe-two');
  await finance.openRegisterShift({ id: 'shift', shiftName: 'Shift', openingCash: 100 }, a, actor('dual'));
  await assert.rejects(finance.openRegisterShift({ id: 'shift', shiftName: 'Shift', openingCash: 100 }, b, actor('dual')), /permission/i);
  await assertSucceeds(getDocs(scope.restaurantCollection(b, 'expenses')));
  await assertFails(updateDoc(scope.restaurantDoc(b, 'raw_materials', 'rice'), { currentStock: 0 }));
});
test('concurrent identical bill IDs stay isolated across stock, register, KOT, payments, and print queue', async () => {
  const handles = [scoped('owner-a', 'tbk'), scoped('owner-b', 'cafe-two')];
  for (const [index, database] of handles.entries()) {
    const uid = index ? 'owner-b' : 'owner-a';
    await finance.openRegisterShift({ id: 'shift', shiftName: 'Shift', openingCash: index ? 200 : 100 }, database, actor(uid));
    await settings.saveSettingsCloud('pos', { autoPrintReceipt: true }, database, actor(uid));
    await setDoc(scope.restaurantDoc(database, 'settings', 'printing'), { enabled: true, printers: [{ id: 'printer', name: 'Printer', ipAddress: '192.168.1.50', port: 9100 }], routes: [{ kind: 'receipt', printerId: 'printer', copies: 1 }] });
  }
  const orders = await Promise.all(handles.map((database, index) => billing.placePosOrderCloud({ id: 'SAME-BILL', items: [{ id: 'dish', quantity: index ? 2 : 1, price: 100 }], orderType: 'takeaway', paymentMethod: 'cash', paymentReceived: true, createdById: index ? 'owner-b' : 'owner-a' }, database)));
  assert.deepEqual(orders.map((order) => order.total), [105, 210]);
  for (const [index, database] of handles.entries()) {
    assert.equal((await getDoc(scope.restaurantDoc(database, 'raw_materials', 'rice'))).data().currentStock, index ? 9.8 : 9.9);
    assert.equal((await getDoc(scope.restaurantDoc(database, 'shifts', 'shift'))).data().cashSales, index ? 210 : 105);
    assert.equal((await getDocs(scope.restaurantCollection(database, 'print_queue'))).size, 1);
    assert.equal((await getDocs(scope.restaurantCollection(database, 'kots'))).size, 1);
    assert.equal((await getDocs(scope.restaurantCollection(database, 'finance_entries'))).size, 1);
  }
});
test('suspension and membership revocation immediately deny private access', async () => {
  const db = as('owner-a');
  await environment.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'restaurants', 'tbk'), { status: 'suspended' }));
  await assertFails(getDoc(doc(db, 'restaurants', 'tbk', 'raw_materials', 'rice')));
  await assertFails(getDoc(doc(db, 'restaurants', 'tbk', 'members', 'owner-a')));
  await environment.withSecurityRulesDisabled(async (context) => { await updateDoc(doc(context.firestore(), 'restaurants', 'tbk'), { status: 'active' }); await updateDoc(doc(context.firestore(), 'restaurants', 'tbk', 'members', 'owner-a'), { status: 'suspended' }); });
  await assertFails(getDocs(collection(db, 'restaurants', 'tbk', 'orders')));
});
test('public restaurant identity and menu do not disclose staff or private configuration', async () => {
  const guest = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(guest, 'restaurants', 'tbk')));
  await assertSucceeds(getDoc(doc(guest, 'restaurants', 'tbk', 'public_settings', 'restaurant')));
  await assertFails(getDoc(doc(guest, 'restaurants', 'tbk', 'settings', 'restaurant')));
  await assertFails(getDocs(collection(guest, 'restaurants', 'tbk', 'members')));
  await assertSucceeds(getDocs(collection(as('customer'), 'restaurants', 'tbk', 'menu_items')));
  await assertSucceeds(getDoc(doc(as('customer'), 'restaurants', 'tbk', 'orders', 'private')));
  await assertFails(getDoc(doc(as('owner-b'), 'restaurants', 'tbk', 'orders', 'private')));
});
test('customer pickup confirmation uses only that restaurant’s menu, stock and register', async () => {
  const customer = scoped('customer', 'tbk'); const owner = scoped('owner-a', 'tbk');
  await finance.openRegisterShift({ id: 'shift', shiftName: 'Shift', openingCash: 100 }, owner, actor('owner-a'));
  const request = await takeaway.createTakeawayRequest({ customer: 'Test customer', phone: '9876543210', items: [{ id: 'dish', quantity: 1 }] }, customer, actor('customer'));
  await assert.rejects(takeaway.acceptTakeawayRequest(request.id, actor('owner-b'), scoped('owner-b', 'cafe-two')), /permission|no longer exists/i);
  const order = await takeaway.acceptTakeawayRequest(request.id, actor('owner-a'), owner);
  assert.equal(order.total, 105); assert.equal(order.paymentStatus, 'pending');
  assert.equal((await getDoc(scope.restaurantDoc(owner, 'takeaway_requests', request.id))).data().status, 'accepted');
  assert.equal((await getDoc(scope.restaurantDoc(scoped('owner-b', 'cafe-two'), 'raw_materials', 'rice'))).data().currentStock, 10);
  assert.equal((await getDoc(scope.restaurantDoc(owner, 'raw_materials', 'rice'))).data().currentStock, 9.9);
});
test('new restaurant defaults use its own identity and cannot issue a TBK bill without configuration', async () => {
  const database = scoped('owner-b', 'cafe-two');
  await environment.withSecurityRulesDisabled((context) => deleteDoc(doc(context.firestore(), 'restaurants', 'cafe-two', 'settings', 'restaurant')));
  await assert.rejects(billing.placePosOrderCloud({ id: 'bill', items: [{ id: 'dish', quantity: 1, price: 100 }], orderType: 'takeaway', paymentMethod: 'cash' }, database), /billing details/);
  const saved = await settings.saveSettingsCloud('restaurant', { cgstRate: 2.5 }, database, actor('owner-b'));
  assert.equal(saved.name, 'cafe-two'); assert.equal(saved.address, '');
  assert.equal((await getDoc(scope.restaurantDoc(database, 'public_settings', 'restaurant'))).data().name, 'cafe-two');
});
test('migration copies a consistent legacy snapshot, preserves history, and never overwrites a running tenant', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', 'source-owner'), member('source-owner', 'Owner', 'legacy'));
    await setDoc(doc(db, 'raw_materials', 'chicken'), { id: 'chicken', currentStock: 5, unitCost: 300, createdAt: Timestamp.fromDate(new Date('2026-10-01T00:00:00Z')) });
    await setDoc(doc(db, 'recipes', 'source-recipe'), { materialRef: doc(db, 'raw_materials', 'chicken'), dishName: 'Dish' });
  });
  const request = await firebaseTransport(project);
  const snapshot = await readLegacySnapshot(request, project); const plan = migrationPlan(snapshot, 'migration-tbk', 'TBK development copy');
  const result = await applyMigration(request, plan); assert.equal(result.status, 'complete');
  const database = scoped('source-owner', 'migration-tbk');
  const copied = (await getDoc(scope.restaurantDoc(database, 'raw_materials', 'chicken'))).data();
  assert.equal(copied.currentStock, 5); assert.equal(copied.createdAt.toDate().toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal((await getDoc(scope.restaurantDoc(database, 'recipes', 'source-recipe'))).data().materialRef.path, 'restaurants/migration-tbk/raw_materials/chicken');
  await updateDoc(scope.restaurantDoc(database, 'raw_materials', 'chicken'), { currentStock: 4 });
  assert.equal((await applyMigration(request, plan)).status, 'already-complete');
  assert.equal((await getDoc(scope.restaurantDoc(database, 'raw_materials', 'chicken'))).data().currentStock, 4);
  assert.equal((await getDoc(doc(as('legacy-owner'), 'raw_materials', 'chicken'))).data().currentStock, 5);
  await assertFails(getDoc(doc(as('source-owner'), 'restaurants', 'migration-tbk', '_migrations', 'initial')));
  await assert.rejects(applyMigration(request, { ...plan, id: 'different-plan' }), /already exists/);
});
test('legacy profile compatibility initializes missing settings once and preserves later staff edits', async () => {
  await environment.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), 'settings', 'profile'), { name: 'Original restaurant', address: 'Original address', cgstRate: 2.5 }));
  const request = await firebaseTransport(project);
  const snapshot = await readLegacySnapshot(request, project);
  const plan = migrationPlan(snapshot, 'profile-copy');
  assert.ok(plan.documents.some((document) => document.name.endsWith('/settings/restaurant')));
  await applyMigration(request, plan);
  // Reproduce the earlier copy shape without changing any business source.
  await environment.withSecurityRulesDisabled((context) => deleteDoc(doc(context.firestore(), 'restaurants', 'profile-copy', 'settings', 'restaurant')));
  assert.equal((await normalizeLegacyRestaurantSettings(request, plan)).status, 'initialized-from-legacy-profile');
  const db = scoped('legacy-owner', 'profile-copy');
  assert.equal((await getDoc(scope.restaurantDoc(db, 'settings', 'restaurant'))).data().address, 'Original address');
  await updateDoc(scope.restaurantDoc(db, 'settings', 'restaurant'), { address: 'Later staff edit' });
  assert.equal((await normalizeLegacyRestaurantSettings(request, plan)).status, 'already-configured');
  assert.equal((await getDoc(scope.restaurantDoc(db, 'settings', 'restaurant'))).data().address, 'Later staff edit');
});
