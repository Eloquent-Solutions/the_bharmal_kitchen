import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRestaurant, restaurantCacheKey, restaurantBridgeId } from '../src/tenancy/identity.js';
import { migrationPlan, requireDevelopmentProject } from '../scripts/tenancy/copyRestaurant.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { scopedCollectionName } from '../src/tenancy/collections.js';

test('restaurant address resolution fails closed on unknown, reserved and misleading hosts', () => {
  const resolve = (hostname, more = {}) => resolveRestaurant({ enabled: true, hostname, ...more });
  assert.equal(resolve('tbk.eloquentsolutions.in').restaurantId, 'tbk');
  assert.equal(resolve('cafe-two.eloquentsolutions.in').restaurantId, 'cafe-two');
  assert.equal(resolve('eloquentsolutions.in').mode, 'platform');
  assert.equal(resolve('tbk.eloquentsolutions.in.evil.example').mode, 'unknown');
  assert.equal(resolve('a.b.eloquentsolutions.in').mode, 'unknown');
  assert.equal(resolve('api.eloquentsolutions.in').mode, 'unknown');
  assert.equal(resolve('127.0.0.1', { localRestaurantId: 'tbk' }).mode, 'unknown');
  assert.equal(resolve('127.0.0.1', { localRestaurantId: 'tbk', development: true }).restaurantId, 'tbk');
  assert.equal(resolve('tbk.localhost', { development: true }).restaurantId, 'tbk');
  assert.equal(resolveRestaurant({ enabled: false }).mode, 'legacy');
});
test('local caches, user records, and physical print job IDs stay restaurant-specific', () => {
  const key = (restaurantId, uid = 'owner') => restaurantCacheKey({ projectId: 'dev', restaurantId, uid }, 'materials');
  assert.notEqual(key('tbk'), key('cafe-two'));
  assert.notEqual(key('tbk'), key('tbk', 'another-user'));
  assert.notEqual(restaurantBridgeId('tbk', 'AUTO-BILL-1'), restaurantBridgeId('cafe-two', 'AUTO-BILL-1'));
  assert.throws(() => key('../other'), /Invalid/);
});
test('new app code cannot accidentally import unscoped Firestore paths', () => {
  const exceptions = new Set(['src/firebase/config.js', 'src/firebase/restaurantDb.js', 'src/tenancy/RestaurantProvider.jsx']);
  const files = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(`${directory}/${entry.name}`) : /\.jsx?$/.test(entry.name) ? [`${directory}/${entry.name}`] : []);
  for (const file of files('src')) {
    if (exceptions.has(file)) continue;
    const source = readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'firebase\/firestore'/gs)].flatMap((match) => match[1].split(',').map((name) => name.trim()));
    assert.equal(imports.some((name) => ['doc', 'collection', 'runTransaction', 'collectionGroup'].includes(name)), false, `Unscoped access in ${file}`);
    for (const match of source.matchAll(/(?:doc|collection)\((?:database|db),\s*'([^']+)'/g)) assert.doesNotThrow(() => scopedCollectionName(match[1]), `Unmapped collection in ${file}: ${match[1]}`);
  }
});
test('copy plans block production, preserve member UIDs and timestamps, and remap database references', () => {
  assert.throws(() => requireDevelopmentProject('the-bharmal-kitchen'), /Production/);
  const snapshot = { projectId: 'demo-tenant-copy', counts: {}, capturedAt: '2026-10-31', documents: [
    { collection: 'users', id: 'owner-uid', fields: { role: { stringValue: 'Owner' }, status: { stringValue: 'active' }, createdAt: { timestampValue: '2026-10-01T00:00:00Z' } } },
    { collection: 'recipes', id: 'recipe', fields: { material: { referenceValue: 'projects/demo-tenant-copy/databases/(default)/documents/raw_materials/chicken' } } },
  ] };
  const plan = migrationPlan(snapshot);
  const member = plan.documents.find((document) => document.name.endsWith('/members/owner-uid'));
  assert.equal(member.fields.uid.stringValue, 'owner-uid'); assert.equal(member.fields.createdAt.timestampValue, '2026-10-01T00:00:00Z');
  assert.equal(member.fields.restaurantId.stringValue, 'tbk');
  assert.match(plan.documents.find((document) => document.name.endsWith('/recipes/recipe')).fields.material.referenceValue, /restaurants\/tbk\/raw_materials\/chicken$/);
  assert.throws(() => migrationPlan({ ...snapshot, documents: [{ ...snapshot.documents[1], fields: { ref: { referenceValue: 'projects/foreign/databases/(default)/documents/users/x' } } }, snapshot.documents[0]] }), /outside/);
});
