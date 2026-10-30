import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
let environment, vite, settings, printing, billing, takeaway, drafts, routing;
const actor = (uid = 'owner') => ({ uid, displayName: uid });
const as = (uid = 'owner') => environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
const printer = { id: 'cash', name: 'Cashier', ipAddress: '192.168.1.50', port: 9100, paperWidth: '80mm', autoCut: true };
const config = { enabled: true, printers: [printer], routes: [{ kind: 'receipt', printerId: 'cash', copies: 1 }, { kind: 'kot', station: '*', printerId: 'cash', copies: 1 }] };
const bill = (id) => ({ id, items: [{ id: 'dish', quantity: 1, price: 100 }], orderType: 'takeaway', paymentMethod: 'cash', paymentReceived: false, createdById: 'owner' });
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST); process.env.VITE_DATA_MODE = 'demo'; process.env.VITE_FINANCE_ENABLED = 'false';
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  environment = await initializeTestEnvironment({ projectId: 'demo-tbk-settings', firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') } });
  vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: { server: createHttpServer() } }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
  [settings, printing, billing, takeaway, drafts, routing] = await Promise.all(['/src/services/settingsCloud.js', '/src/services/printingCloud.js', '/src/services/billingCloud.js', '/src/services/takeawayCloud.js', '/src/services/recipeDraftsCloud.js', '/src/utils/printRouting.js'].map((file) => vite.ssrLoadModule(file)));
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role] of [['owner', 'Owner'], ['manager', 'Manager'], ['customer', 'Customer'], ['accountant', 'Accountant']]) await setDoc(doc(db, 'users', uid), { uid, role, status: 'active' });
    await setDoc(doc(db, 'settings', 'restaurant'), { name: 'Kitchen', address: 'Rajkot', cgstRate: 0, sgstRate: 0, serviceCharge: 0, roundOff: false });
    await setDoc(doc(db, 'menu_items', 'dish'), { id: 'dish', name: 'Chicken Rice', price: 100, isAvailable: true, station: 'Wok' });
    await setDoc(doc(db, 'raw_materials', 'rice'), { id: 'rice', name: 'Rice', unit: 'kg', currentStock: 5, unitCost: 50 });
    await setDoc(doc(db, 'recipes', 'recipe'), { id: 'recipe', dishId: 'dish', yieldServings: 1, ingredients: [{ id: 'rice', name: 'Rice', qty: 0.1, unit: 'kg' }] });
  });
});
after(async () => { await vite?.close(); await environment?.cleanup(); });
test('settings patches preserve tax/contact fields; public profile contains only safe fields; audit is immutable', async () => {
  const db = as();
  await Promise.all([settings.saveSettingsCloud('restaurant', { name: 'New Kitchen', gstin: 'PRIVATE-ID' }, db, actor()), settings.saveSettingsCloud('restaurant', { cgstRate: 2.5, sgstRate: 2.5 }, db, actor())]);
  const current = (await getDoc(doc(db, 'settings', 'restaurant'))).data(); assert.equal(current.name, 'New Kitchen'); assert.equal(current.cgstRate, 2.5);
  const publicDoc = (await getDoc(doc(environment.unauthenticatedContext().firestore(), 'public_settings', 'restaurant'))).data(); assert.equal(publicDoc.name, 'New Kitchen'); assert.equal(publicDoc.gstin, undefined);
  await assertFails(getDoc(doc(as('customer'), 'settings', 'restaurant')));
  await assert.rejects(settings.saveSettingsCloud('pos', { requireCustomerPhone: true }, as('manager'), actor('manager')), /permission/i);
  const logs = await getDocs(collection(db, 'audit_logs')); assert.equal(logs.size, 2); await assertFails(deleteDoc(logs.docs[0].ref));
});
test('pickup pause blocks client requests and direct writes, reopening restores requests', async () => {
  const db = as(); await settings.saveSettingsCloud('restaurant', { isOpen: false }, db, actor());
  const input = { customer: 'Guest', phone: '9876543210', items: [{ id: 'dish', quantity: 1 }] };
  await assert.rejects(takeaway.createTakeawayRequest(input, as('customer'), actor('customer')), /paused/);
  await assertFails(setDoc(doc(as('customer'), 'takeaway_requests', 'bad'), { id: 'bad', customerUid: 'customer', customer: 'Guest', phone: '9876543210', items: [{ dishId: 'dish', qty: 1 }], notes: '', orderType: 'takeaway', paymentMethod: 'cash', paymentStatus: 'pending', status: 'pending', createdAt: new Date().toISOString() }));
  await settings.saveSettingsCloud('restaurant', { isOpen: true }, db, actor());
  assert.equal((await takeaway.createTakeawayRequest(input, as('customer'), actor('customer'))).status, 'pending');
});
test('bill, KOT, stock, receipt and station jobs are atomic and idempotent', async () => {
  const db = as(); await printing.savePrintingCloud(config, db, actor()); await settings.saveSettingsCloud('pos', { autoPrintKOTOnOrder: true, autoPrintReceipt: true }, db, actor());
  await printing.saveReceiptTemplateCloud({ version: 2, footer: 'Rajkot pickup' }, db, actor());
  await billing.placePosOrderCloud(bill('print-bill'), db); await billing.placePosOrderCloud(bill('print-bill'), db);
  const jobs = await getDocs(collection(db, 'print_queue')); assert.equal(jobs.size, 2); assert.equal((await getDoc(doc(db, 'raw_materials', 'rice'))).data().currentStock, 4.9);
  assert.ok(jobs.docs.find((entry) => entry.data().kind === 'receipt').data().document.blocks.some((b) => b.text === 'Rajkot pickup'));
  await printing.savePrintingCloud({ ...config, routes: [] }, db, actor());
  await assert.rejects(billing.placePosOrderCloud(bill('missing-route'), db), /route/);
  assert.equal((await getDoc(doc(db, 'orders', 'missing-route'))).exists(), false); assert.equal((await getDoc(doc(db, 'raw_materials', 'rice'))).data().currentStock, 4.9);
});
test('multiple print stations claim only once, recover expired claims as uncertain, preserve job payload', async () => {
  const db = as(); await printing.savePrintingCloud(config, db, actor()); await settings.saveSettingsCloud('pos', { autoPrintReceipt: true }, db, actor()); await billing.placePosOrderCloud(bill('lease'), db);
  const id = (await getDocs(collection(db, 'print_queue'))).docs[0].id;
  let claims;
  await assert.doesNotReject(async () => { claims = await Promise.all([printing.claimPrintJob(id, 'dev1', db, actor()), printing.claimPrintJob(id, 'dev2', as('manager'), actor('manager'))]); }, 'initial competing claims'); assert.equal(claims.filter(Boolean).length, 1);
  await assertFails(updateDoc(doc(db, 'print_queue', id), { document: { blocks: [] } }));
  await environment.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'print_queue', id), { leaseUntil: Timestamp.fromMillis(Date.now() - 1000) }));
  await assert.doesNotReject(printing.claimPrintJob(id, 'dev3', db, actor()), 'expired claim recovery'); assert.equal((await getDoc(doc(db, 'print_queue', id))).data().status, 'unknown');
  await assert.rejects(printing.reprintJob({ id, status: 'unknown' }, false, db, actor()), /Check the printer/);
});
test('POS phone requirement applies in the transaction, not only in the form', async () => {
  const db = as(); await settings.saveSettingsCloud('pos', { requireCustomerPhone: true }, db, actor());
  await assert.rejects(billing.placePosOrderCloud(bill('no-phone'), db), /phone/);
  assert.equal((await billing.placePosOrderCloud({ ...bill('phone'), phone: '9876543210' }, db)).phone, '9876543210');
});
test('recipe draft never bills; reviewed recipe needs priced separate ingredients and cannot replace existing recipe', async () => {
  const db = as(); await deleteDoc(doc(db, 'recipes', 'recipe'));
  const draft = { id: 'DRAFT-dish', dishId: 'dish', dishName: 'Chicken Rice', yieldServings: 1, sellingPrice: 100, instructions: 'Estimate', status: 'draft', ingredients: [{ id: 'rice', name: 'Rice', qty: 0.1, unit: 'kg' }] };
  assert.equal(await drafts.saveRecipeDraftCloud(draft, db, actor()), true); assert.equal(await drafts.saveRecipeDraftCloud(draft, db, actor()), false);
  await assert.rejects(billing.placePosOrderCloud(bill('unapproved'), db), /recipe/);
  await drafts.approveRecipeDraftCloud(draft, db, actor());
  assert.equal((await billing.placePosOrderCloud(bill('approved'), db)).ingredientCost, 5);
  await assert.rejects(drafts.approveRecipeDraftCloud(draft, db, actor()), /already has/);
});
test('routing splits kitchen items by station and safely rejects duplicate routes and public IPs', () => {
  assert.throws(() => routing.validatePrinting({ ...config, printers: [{ ...printer, ipAddress: '8.8.8.8' }] }), /private/);
  assert.throws(() => routing.validatePrinting({ ...config, routes: [...config.routes, config.routes[0]] }), /one receipt/);
  const jobs = routing.planPrintJobs({ id: 'multi', createdAt: 'now', createdById: 'owner', items: [{ name: 'Wok', station: 'Wok', qty: 1 }, { name: 'Grill', station: 'Grill', qty: 2 }] }, { id: 'kot', orderId: 'multi' }, config, { autoPrintKOTOnOrder: true });
  assert.equal(jobs.length, 2); assert.equal(jobs[0].document.blocks.some((b) => b.text?.includes('Grill')), false);
});
