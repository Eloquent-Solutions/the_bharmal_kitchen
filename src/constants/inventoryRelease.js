// Routes offered in the first staff inventory release. This is a UI scope,
// while Firestore rules remain the data access boundary.
export const INVENTORY_HOME = '/inventory/materials';

export const INVENTORY_RELEASE_TABS = new Set([
  'inventory',
  'inventory-materials',
  'inventory-stock',
  'inventory-wastage',
  'inventory-count',
  'inventory-utensils',
  'purchasing',
  'purchasing-bills',
  'purchasing-suppliers',
  'reports',
  'reports-inventory',
  'settings',
  'settings-users',
]);

export const INVENTORY_RELEASE_ROUTES = new Set([
  '/inventory',
  '/inventory/materials',
  '/inventory/stock',
  '/inventory/wastage',
  '/inventory/count',
  '/inventory/utensils',
  '/purchasing',
  '/purchasing/bills',
  '/purchasing/suppliers',
  '/reports',
  '/reports/inventory',
  '/settings',
  '/settings/users',
]);

export const BILLING_RELEASE_TABS = new Set(['pos', 'orders', 'orders-history']);
export const BILLING_RELEASE_ROUTES = new Set(['/pos', '/orders', '/orders/history']);

export function inventoryReleaseTabForPath(pathname) {
  if (pathname === '/inventory') return 'inventory';
  if (pathname === '/purchasing') return 'purchasing';
  if (pathname === '/reports') return 'reports';
  if (pathname === '/settings') return 'settings';
  return pathname.slice(1).replace('/', '-');
}
