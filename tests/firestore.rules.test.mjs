import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const [host = '127.0.0.1', port = '8080'] = (process.env.FIRESTORE_EMULATOR_HOST || '').split(':');
let environment;

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Start this test through firebase emulators:exec');
  environment = await initializeTestEnvironment({
    projectId: 'demo-tbk-rules',
    firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role] of [
      ['owner', 'Owner'],
      ['inventory', 'Inventory Manager'],
      ['cashier', 'Cashier'],
      ['customer', 'Customer'],
      ['suspended', 'Owner'],
    ]) {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: `${uid}@example.test`,
        role,
        status: uid === 'suspended' ? 'suspended' : 'active',
        allowedTabs: [],
      });
    }
    await setDoc(doc(db, 'raw_materials', 'rice'), { name: 'Rice' });
    await setDoc(doc(db, 'orders', 'order-1'), { total: 100 });
  });
});

after(async () => environment?.cleanup());

const as = (uid) => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();

test('anonymous, customer, and suspended users cannot read operational data', async () => {
  await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'orders', 'order-1')));
  await assertFails(getDoc(doc(as('customer'), 'orders', 'order-1')));
  await assertFails(getDoc(doc(as('suspended'), 'orders', 'order-1')));
  await assertFails(setDoc(doc(as('customer'), 'raw_materials', 'flour'), { name: 'Flour' }));
});

test('new account can create only its own Customer profile', async () => {
  const db = as('new-staff');
  const own = doc(db, 'users', 'new-staff');
  const profile = {
    uid: 'new-staff',
    email: 'new-staff@example.test',
    role: 'Customer',
    status: 'active',
    allowedTabs: [],
  };
  await assertFails(setDoc(own, { ...profile, role: 'Owner' }));
  await assertFails(setDoc(doc(db, 'users', 'another'), profile));
  await assertSucceeds(setDoc(own, profile));
  await assertFails(updateDoc(own, { role: 'Owner' }));
  await assertSucceeds(updateDoc(own, { lastLogin: 'today' }));
  await assertFails(getDocs(collection(db, 'users')));
});

test('owner can assign a staff role and manage operations', async () => {
  const db = as('owner');
  await assertSucceeds(updateDoc(doc(db, 'users', 'customer'), {
    role: 'Cashier',
    allowedTabs: ['dashboard', 'pos'],
  }));
  await assertSucceeds(getDocs(collection(db, 'users')));
  await assertSucceeds(setDoc(doc(db, 'raw_materials', 'flour'), { name: 'Flour' }));
});

test('staff permissions differ by role', async () => {
  const inventory = as('inventory');
  const cashier = as('cashier');
  await assertSucceeds(getDoc(doc(inventory, 'raw_materials', 'rice')));
  await assertSucceeds(setDoc(doc(inventory, 'raw_materials', 'flour'), { name: 'Flour' }));
  await assertFails(setDoc(doc(inventory, 'orders', 'order-2'), { total: 10 }));
  await assertSucceeds(setDoc(doc(cashier, 'orders', 'order-2'), { total: 10 }));
  await assertFails(getDoc(doc(cashier, 'raw_materials', 'rice')));
  await assertFails(updateDoc(doc(cashier, 'users', 'owner'), { role: 'Cashier' }));
});
