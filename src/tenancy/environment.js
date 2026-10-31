export const DEVELOPMENT_FIREBASE_PROJECT = 'the-bharmal-s-kitchen';
export const PRODUCTION_FIREBASE_PROJECT = 'the-bharmal-kitchen';
export const DEVELOPMENT_HOST = 'the-bharmal-kitchen.vercel.app';

// Runs before Firebase initializes, as well as in the hosted build preflight.
// A Vercel Preview build is still a minified production-mode Vite build, so its
// data target must be selected using the deployment environment, not Vite DEV.
export function validateFirebaseTarget({ environment = 'local', dataMode = 'firebase', projectId, authDomain, multiRestaurant, platformDomain, useEmulators = false }) {
  if (!['local', 'preview', 'production'].includes(environment)) throw new Error('Unsupported deployment environment.');
  if (dataMode === 'demo' && environment === 'local') return;
  if (dataMode !== 'firebase') throw new Error('Hosted deployments require Firebase mode.');
  if (environment !== 'local' && useEmulators) throw new Error('Hosted deployments cannot use Firebase emulators.');
  const emulator = environment === 'local' && useEmulators && /^demo-[a-z0-9-]+$/.test(projectId || '');
  const expected = environment === 'production' ? PRODUCTION_FIREBASE_PROJECT : DEVELOPMENT_FIREBASE_PROJECT;
  if (projectId !== expected && !emulator) throw new Error(`${environment === 'production' ? 'Production' : 'Local and Preview'} must use Firebase project ${expected}.`);
  if (!emulator && authDomain && authDomain !== `${expected}.firebaseapp.com`) throw new Error(`Firebase Auth must also use the ${expected} project configuration.`);
  if (environment !== 'local' && (!multiRestaurant || platformDomain !== 'eloquentsolutions.in')) throw new Error('Hosted deployments require restaurant isolation and VITE_PLATFORM_DOMAIN=eloquentsolutions.in.');
}

export function previewHostnames(environment, generatedHosts = []) {
  if (environment !== 'preview') return [];
  return [...new Set([DEVELOPMENT_HOST, ...generatedHosts].filter(host => typeof host === 'string' && /^[a-z0-9-]+\.vercel\.app$/.test(host)))];
}
