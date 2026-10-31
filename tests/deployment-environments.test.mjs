import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { DEVELOPMENT_FIREBASE_PROJECT as dev, PRODUCTION_FIREBASE_PROJECT as prod, DEVELOPMENT_HOST, previewHostnames, validateFirebaseTarget } from '../src/tenancy/environment.js';
import { resolveRestaurant } from '../src/tenancy/identity.js';
const settings = (environment, projectId) => ({ environment, projectId, authDomain: `${projectId}.firebaseapp.com`, dataMode: 'firebase', multiRestaurant: true, platformDomain: 'eloquentsolutions.in' });
test('local and hosted testing reject production before Firebase can initialize', () => {
  for (const environment of ['local', 'preview']) {
    assert.doesNotThrow(() => validateFirebaseTarget(settings(environment, dev)));
    assert.throws(() => validateFirebaseTarget(settings(environment, prod)), /must use Firebase project/);
    assert.throws(() => validateFirebaseTarget({ ...settings(environment, dev), authDomain: `${prod}.firebaseapp.com` }), /Firebase Auth/);
  }
  assert.doesNotThrow(() => validateFirebaseTarget(settings('production', prod)));
  assert.throws(() => validateFirebaseTarget(settings('production', dev)), /Production must use/);
});
test('hosted builds cannot use demo mode, disable isolation or connect to emulators', () => {
  assert.doesNotThrow(() => validateFirebaseTarget({ environment: 'local', dataMode: 'demo' }));
  for (const environment of ['preview', 'production']) {
    const valid = settings(environment, environment === 'production' ? prod : dev);
    assert.throws(() => validateFirebaseTarget({ ...valid, dataMode: 'demo' }), /Hosted/);
    assert.throws(() => validateFirebaseTarget({ ...valid, multiRestaurant: false }), /restaurant isolation/);
    assert.throws(() => validateFirebaseTarget({ ...valid, useEmulators: true }), /emulators/);
  }
  assert.doesNotThrow(() => validateFirebaseTarget({ ...settings('local', 'demo-tbk-review'), authDomain: 'localhost', useEmulators: true }));
});
test('the reused Vercel address and exact generated previews use only the dev TBK namespace', () => {
  const branch = 'the-bharmal-kitchen-git-develop-eloquent-solutions.vercel.app';
  const unique = 'the-bharmal-kitchen-build123-eloquent-solutions.vercel.app';
  const resolve = (hostname, overrides = {}) => resolveRestaurant({ enabled: true, hostname, deploymentEnvironment: 'preview', firebaseProjectId: dev, previewHosts: [branch, unique], ...overrides });
  for (const hostname of [DEVELOPMENT_HOST, branch, unique]) assert.equal(resolve(hostname).restaurantId, 'tbk');
  for (const hostname of ['other-project.vercel.app', `${DEVELOPMENT_HOST}.evil.example`, 'the-bharmal-kitchen-git-main-eloquent-solutions.vercel.app']) assert.equal(resolve(hostname).mode, 'unknown');
  assert.equal(resolve(DEVELOPMENT_HOST, { firebaseProjectId: prod }).mode, 'unknown');
  assert.equal(resolve(DEVELOPMENT_HOST, { deploymentEnvironment: 'production' }).mode, 'unknown');
  assert.equal(resolve('tbk.eloquentsolutions.in', { deploymentEnvironment: 'production', firebaseProjectId: prod }).restaurantId, 'tbk');
  assert.equal(resolve('127.0.0.1', { deploymentEnvironment: 'local', development: true, localRestaurantId: 'tbk' }).restaurantId, 'tbk');
});
test('only trusted Vercel deployment metadata can add preview host aliases', () => {
  assert.deepEqual(previewHostnames('production', ['any.vercel.app']), []);
  assert.deepEqual(previewHostnames('local', ['any.vercel.app']), []);
  assert.deepEqual(previewHostnames('preview', ['own-build.vercel.app', 'https://evil.example', 'a.b.vercel.app', 'own-build.vercel.app']), [DEVELOPMENT_HOST, 'own-build.vercel.app']);
});
test('Vercel preflight rejects crossed projects and incomplete web configuration', () => {
  const run = (environment, projectId, extra = {}) => spawnSync(process.execPath, ['scripts/check-vercel-env.mjs'], { encoding: 'utf8', env: { ...process.env, VERCEL_ENV: environment, VITE_DATA_MODE: 'firebase', VITE_MULTI_RESTAURANT: 'true', VITE_PLATFORM_DOMAIN: 'eloquentsolutions.in', VITE_STAFF_ONLY: 'true', VITE_INVENTORY_ONLY: 'true', VITE_BILLING_ENABLED: 'true', VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_API_KEY: 'test-web-key', VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`, VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`, VITE_FIREBASE_MESSAGING_SENDER_ID: '123', VITE_FIREBASE_APP_ID: '1:123:web:test', VITE_USE_FIREBASE_EMULATORS: 'false', ...extra } });
  assert.equal(run('preview', dev).status, 0);
  assert.equal(run('production', prod).status, 0);
  assert.notEqual(run('preview', prod).status, 0);
  assert.notEqual(run('production', dev).status, 0);
  assert.notEqual(run('preview', dev, { VITE_FIREBASE_APP_ID: '' }).status, 0);
  assert.notEqual(run('preview', dev, { VITE_FIREBASE_AUTH_DOMAIN: `${prod}.firebaseapp.com` }).status, 0);
});
