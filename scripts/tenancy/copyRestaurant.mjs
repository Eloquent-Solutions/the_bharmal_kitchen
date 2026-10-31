import { createHash, randomUUID } from 'node:crypto';
import { RESTAURANT_COLLECTIONS, scopedCollectionName } from '../../src/tenancy/collections.js';
import { assertRestaurantId } from '../../src/tenancy/identity.js';
export const DEVELOPMENT_PROJECT = 'the-bharmal-s-kitchen';
const str = (value) => ({ stringValue: String(value ?? '') });
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const hash = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function requireDevelopmentProject(projectId) {
  if (projectId !== DEVELOPMENT_PROJECT && !projectId.startsWith('demo-')) throw new Error('This migration copies development data only. Production projects are blocked.');
}
async function readSnapshot(request, projectId, checkProject) {
  checkProject(projectId);
  const base = `projects/${projectId}/databases/(default)/documents`;
  let collectionPage;
  do {
    const inventory = await request('POST', `${base}:listCollectionIds`, { pageSize: 1000, ...(collectionPage ? { pageToken: collectionPage } : {}) });
    const unknown = (inventory.collectionIds || []).filter((name) => !RESTAURANT_COLLECTIONS.includes(name) && !['restaurants', 'platform_admins', 'migration_runs', 'platform_migrations'].includes(name));
    if (unknown.length) throw new Error(`Review unmapped source collections before copying: ${unknown.join(', ')}`);
    collectionPage = inventory.nextPageToken;
  } while (collectionPage);
  const { transaction } = await request('POST', `${base}:beginTransaction`, { options: { readOnly: {} } });
  const documents = []; const counts = {};
  try {
    for (const name of RESTAURANT_COLLECTIONS) {
      // POST carries the transaction's bytes field in JSON. The emulator does
      // not support this field in listDocuments' GET query parameters.
      const rows = await request('POST', `${base}:runQuery`, { transaction, structuredQuery: { from: [{ collectionId: name }], limit: 10001 } });
      for (const { document } of rows || []) {
        if (!document) continue;
        const id = document.name.split('/').at(-1);
        documents.push({ collection: name, id, fields: document.fields || {}, updateTime: document.updateTime });
        if (documents.length > 10000) throw new Error('Review a staged export for migrations over 10,000 documents.');
      }
      counts[name] = documents.filter((document) => document.collection === name).length;
    }
  } finally { await request('POST', `${base}:rollback`, { transaction }); }
  return { projectId, capturedAt: new Date().toISOString(), documents, counts };
}
function translateReferences(value, projectId, restaurantId) {
  if (Array.isArray(value)) return value.map((entry) => translateReferences(entry, projectId, restaurantId));
  if (!value || typeof value !== 'object') return value;
  if (typeof value.referenceValue === 'string') {
    const prefix = `projects/${projectId}/databases/(default)/documents/`;
    if (!value.referenceValue.startsWith(prefix)) throw new Error('A source record has a reference outside the source database.');
    const parts = value.referenceValue.slice(prefix.length).split('/');
    if (parts.length !== 2 || !RESTAURANT_COLLECTIONS.includes(parts[0])) throw new Error('A source reference needs an explicit restaurant mapping.');
    return { referenceValue: `${prefix}restaurants/${restaurantId}/${scopedCollectionName(parts[0])}/${parts[1]}` };
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, translateReferences(entry, projectId, restaurantId)]));
}
function makePlan(snapshot, restaurantId, displayName, checkProject) {
  checkProject(snapshot.projectId); assertRestaurantId(restaurantId);
  const base = `projects/${snapshot.projectId}/databases/(default)/documents/restaurants/${restaurantId}`;
  const documents = snapshot.documents.map((document) => {
    if (!RESTAURANT_COLLECTIONS.includes(document.collection) || !document.id || document.id.includes('/')) throw new Error('Invalid source document.');
    let fields = translateReferences(document.fields, snapshot.projectId, restaurantId);
    if (document.collection === 'users') fields = { ...fields, uid: str(document.id), restaurantId: str(restaurantId), organizationId: str(restaurantId) };
    if (document.collection === 'public_settings' && document.id === 'restaurant') fields = publicFields(fields, displayName);
    return { name: `${base}/${scopedCollectionName(document.collection)}/${document.id}`, fields };
  });
  const restaurant = snapshot.documents.find((document) => document.collection === 'settings' && document.id === 'restaurant')
    || snapshot.documents.find((document) => document.collection === 'settings' && document.id === 'profile');
  if (restaurant && !documents.some((document) => document.name === `${base}/settings/restaurant`)) {
    documents.push({ name: `${base}/settings/restaurant`, fields: translateReferences(restaurant.fields, snapshot.projectId, restaurantId) });
  }
  if (!documents.some((document) => document.name === `${base}/public_settings/restaurant`)) {
    documents.push({ name: `${base}/public_settings/restaurant`, fields: publicFields(restaurant?.fields || {}, displayName) });
  }
  if (!documents.some((document) => document.name.includes('/members/') && document.fields.role?.stringValue === 'Owner' && document.fields.status?.stringValue === 'active')) throw new Error('An active owner membership is required before migrating TBK.');
  return { version: 1, id: randomUUID(), projectId: snapshot.projectId, restaurantId, name: displayName, capturedAt: snapshot.capturedAt, sourceCounts: snapshot.counts, sourceHash: hash(snapshot.documents), documents, dataHash: hash(documents) };
}
// Compatibility for an initial copy created before the legacy profile alias was
// recognized. Only initializes a missing canonical document; never replaces a
// restaurant's saved settings, and checks migration provenance and public data.
export async function normalizeLegacyRestaurantSettings(request, plan) {
  requireDevelopmentProject(plan.projectId); assertRestaurantId(plan.restaurantId);
  if (hash(plan.documents) !== plan.dataHash) throw new Error('The migration plan changed.');
  const base = `projects/${plan.projectId}/databases/(default)/documents`;
  const root = `${base}/restaurants/${plan.restaurantId}`;
  const target = `${root}/settings/restaurant`;
  if (await maybeRead(request, target)) return { status: 'already-configured' };
  const legacy = plan.documents.find((document) => document.name === `${root}/settings/profile`);
  if (!legacy) return { status: 'no-legacy-profile' };
  const originalPublic = plan.documents.find((document) => document.name === `${root}/public_settings/restaurant`);
  const manifest = await maybeRead(request, `${root}/_migrations/initial`);
  const profile = await maybeRead(request, legacy.name);
  const publicProfile = await maybeRead(request, `${root}/public_settings/restaurant`);
  if (manifest?.fields.planId?.stringValue !== plan.id || hash(profile?.fields) !== hash(legacy.fields)
    || !originalPublic || hash(publicProfile?.fields) !== hash(originalPublic.fields)) throw new Error('The copied settings changed; review them before mapping the legacy profile.');
  await request('POST', `${base}:commit`, { writes: [
    { update: { name: target, fields: legacy.fields }, currentDocument: { exists: false } },
    { update: { name: `${root}/public_settings/restaurant`, fields: publicFields(legacy.fields, plan.name) }, currentDocument: { updateTime: publicProfile.updateTime } },
    { update: { name: `${root}/_migrations/legacy_settings`, fields: { planId: str(plan.id), completedAt: str(new Date().toISOString()) } }, currentDocument: { exists: false } },
  ] });
  return { status: 'initialized-from-legacy-profile' };
}
function publicFields(fields, displayName) {
  return { name: fields.name?.stringValue ? fields.name : str(displayName), address: fields.address || str(''), phone: fields.phone || str(''), googleMapUrl: fields.googleMapUrl || str(''), isOpen: { booleanValue: fields.isOpen?.booleanValue !== false } };
}
async function maybeRead(request, name) {
  try { return await request('GET', name); } catch (error) { if (error.status === 404 || /404/.test(error.message)) return null; throw error; }
}
function batches(documents) {
  const result = []; let current = []; let bytes = 0;
  for (const document of documents) {
    const size = Buffer.byteLength(JSON.stringify(document));
    if (current.length >= 100 || bytes + size > 4 * 1024 * 1024) { result.push(current); current = []; bytes = 0; }
    current.push(document); bytes += size;
  }
  if (current.length) result.push(current); return result;
}
async function readMany(request, documentBase, documents) {
  const rows = await request('POST', `${documentBase}:batchGet`, { documents: documents.map((document) => document.name) });
  const found = new Map();
  for (const row of rows || []) {
    if (row.found) found.set(row.found.name, row.found);
    else if (row.missing) found.set(row.missing, null);
  }
  if (documents.some((document) => !found.has(document.name))) throw new Error('The database returned an incomplete verification response.');
  return found;
}
async function copyPlan(request, plan, checkProject) {
  checkProject(plan.projectId); assertRestaurantId(plan.restaurantId);
  if (plan.version !== 1 || hash(plan.documents) !== plan.dataHash) throw new Error('The migration plan changed or is unsupported. Create a new private plan.');
  const documentBase = `projects/${plan.projectId}/databases/(default)/documents`;
  const root = `${documentBase}/restaurants/${plan.restaurantId}`;
  if (plan.documents.some((document) => !document.name.startsWith(`${root}/`) || document.name.slice(root.length + 1).split('/').length !== 2)) throw new Error('A migration target escapes the restaurant namespace.');
  const existing = await maybeRead(request, root);
  if (existing?.fields.status?.stringValue === 'active') {
    const previous = await maybeRead(request, `${root}/_migrations/initial`);
    if (previous?.fields.planId?.stringValue === plan.id) return { status: 'already-complete', copied: 0, restaurantId: plan.restaurantId };
    throw new Error('This restaurant already exists. The migration will not overwrite existing business records.');
  }
  if (existing && existing.fields.migrationId?.stringValue !== plan.id) throw new Error('A different migration already owns this restaurant. Resume its original private plan.');
  const commit = (writes) => request('POST', `${documentBase}:commit`, { writes });
  if (!existing) await commit([{ update: { name: root, fields: { id: str(plan.restaurantId), slug: str(plan.restaurantId), name: str(plan.name), status: str('provisioning'), migrationId: str(plan.id), schemaVersion: { integerValue: '1' } } }, currentDocument: { exists: false } }]);
  let copied = 0;
  for (const batch of batches(plan.documents)) {
    const writes = [];
    const currentRecords = await readMany(request, documentBase, batch);
    for (const document of batch) {
      const current = currentRecords.get(document.name);
      if (current) { if (hash(current.fields || {}) !== hash(document.fields)) throw new Error(`A target record changed during migration: ${document.name}. No record was overwritten.`); }
      else writes.push({ update: document, currentDocument: { exists: false } });
    }
    if (writes.length) { await commit(writes); copied += writes.length; }
  }
  // Verify the frozen copy before making it visible to any app client.
  for (const batch of batches(plan.documents)) {
    const actualRecords = await readMany(request, documentBase, batch);
    for (const document of batch) {
      const actual = actualRecords.get(document.name);
      if (!actual || hash(actual.fields || {}) !== hash(document.fields)) throw new Error(`Copy verification failed for ${document.name}. Restaurant remains unavailable.`);
    }
  }
  const registry = await request('GET', root);
  await commit([
    { update: { name: `${root}/_migrations/initial`, fields: { planId: str(plan.id), sourceHash: str(plan.sourceHash), dataHash: str(plan.dataHash), copiedDocuments: { integerValue: String(plan.documents.length) }, completedAt: str(new Date().toISOString()) } }, currentDocument: { exists: false } },
    { update: { name: root, fields: { ...registry.fields, status: str('active') } }, currentDocument: { updateTime: registry.updateTime } },
  ]);
  return { status: 'complete', copied, restaurantId: plan.restaurantId, sourceCounts: plan.sourceCounts };
}

// Server-side tools bind their own exact project allowlist. The development CLI
// exports below retain their production block; production has a separate
// cutover runner with a required freeze and its own immutable snapshot.
export function createRestaurantCopyTools(checkProject) {
  if (typeof checkProject !== 'function') throw new Error('A project policy is required.');
  return Object.freeze({
    readLegacySnapshot: (request, projectId) => readSnapshot(request, projectId, checkProject),
    migrationPlan: (snapshot, restaurantId = 'tbk', displayName = 'The Bharmals Kitchen') => makePlan(snapshot, restaurantId, displayName, checkProject),
    applyMigration: (request, plan) => copyPlan(request, plan, checkProject),
  });
}
export const { readLegacySnapshot, migrationPlan, applyMigration } = createRestaurantCopyTools(requireDevelopmentProject);
