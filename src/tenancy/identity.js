import { DEVELOPMENT_FIREBASE_PROJECT, previewHostnames } from './environment.js';

export const RESERVED_RESTAURANT_IDS = new Set(['www', 'admin', 'api', 'app', 'auth', 'platform', 'super-admin', 'restaurants', 'localhost']);
export function validRestaurantId(value) {
  return typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value) && !RESERVED_RESTAURANT_IDS.has(value);
}
export function assertRestaurantId(value) {
  if (!validRestaurantId(value)) throw new Error('Invalid restaurant identifier.');
  return value;
}
export function resolveRestaurant({ enabled = false, hostname = '', baseDomain = 'eloquentsolutions.in', localRestaurantId = '', development = false, deploymentEnvironment = 'local', firebaseProjectId = '', previewHosts = [] } = {}) {
  if (!enabled) return Object.freeze({ mode: 'legacy', restaurantId: null, hostname });
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const base = baseDomain.toLowerCase();
  if (deploymentEnvironment === 'preview' && firebaseProjectId === DEVELOPMENT_FIREBASE_PROJECT
    && previewHostnames(deploymentEnvironment, previewHosts).includes(host)) {
    return Object.freeze({ mode: 'restaurant', restaurantId: 'tbk', hostname: host });
  }
  const local = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);
  if (development && local && validRestaurantId(localRestaurantId)) return Object.freeze({ mode: 'restaurant', restaurantId: localRestaurantId, hostname: host });
  if (host === base || host === `www.${base}`) return Object.freeze({ mode: 'platform', restaurantId: null, hostname: host });
  const suffix = development && host.endsWith('.localhost') ? '.localhost' : `.${base}`;
  const slug = host.endsWith(suffix) ? host.slice(0, -suffix.length) : '';
  if (!validRestaurantId(slug)) return Object.freeze({ mode: 'unknown', restaurantId: null, hostname: host });
  return Object.freeze({ mode: 'restaurant', restaurantId: slug, hostname: host });
}
export function restaurantCacheKey({ projectId, restaurantId, uid = 'anonymous' }, key) {
  assertRestaurantId(restaurantId);
  return `tbk:tenant:${encodeURIComponent(projectId || 'demo')}:${restaurantId}:${encodeURIComponent(uid)}:${key}`;
}
export function restaurantBridgeId(restaurantId, jobId) {
  return restaurantId ? `${assertRestaurantId(restaurantId)}--${jobId}` : jobId;
}
