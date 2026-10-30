import { ROLES } from './roles';

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
  'purchasing-orders',
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
  '/purchasing/orders',
  '/purchasing/suppliers',
  '/reports',
  '/reports/inventory',
  '/settings',
  '/settings/users',
]);

export const BILLING_RELEASE_TABS = new Set([
  'pos', 'orders', 'orders-history',
  'menu', 'menu-items', 'menu-categories',
  'inventory-recipes',
  'settings-billing', 'settings-restaurant', 'settings-pos', 'settings-tax', 'settings-notifications', 'settings-audit', 'settings-branches',
  'printing', 'printing-printers', 'printing-templates', 'printing-routing', 'printing-queue',
]);
export const BILLING_RELEASE_ROLES = new Set([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER]);
export const BILLING_RELEASE_ROUTES = new Set([
  '/pos', '/orders', '/orders/history',
  '/menu', '/menu/items', '/menu/categories',
  '/inventory/recipes',
  '/settings/billing', '/settings/restaurant', '/settings/pos', '/settings/tax', '/settings/notifications', '/settings/audit', '/settings/branches',
  '/printing', '/printing/printers', '/printing/templates', '/printing/routing', '/printing/queue',
]);

export const OPERATIONS_RELEASE_TABS = new Set([
  'orders-active', 'kitchen', 'kitchen-kds', 'kitchen-kot',
]);
export const OPERATIONS_RELEASE_ROUTES = new Set([
  '/orders/active', '/kitchen', '/kitchen/kds', '/kitchen/kot',
]);

export const FINANCE_RELEASE_ROLES = new Set([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT]);
export const FINANCE_RELEASE_TABS = new Set([
  'dashboard', 'finance', 'finance-expenses', 'finance-cash-drawer', 'finance-shifts', 'finance-day-close',
  'reports-sales', 'reports-orders', 'reports-food-cost', 'reports-profit', 'reports-tax',
]);
export const FINANCE_RELEASE_ROUTES = new Set([
  '/dashboard', '/finance', '/finance/expenses', '/finance/cash-drawer', '/finance/shifts', '/finance/day-close',
  '/reports/sales', '/reports/orders', '/reports/food-cost', '/reports/profit', '/reports/tax',
]);

export function inventoryReleaseTabForPath(pathname) {
  if (pathname === '/inventory') return 'inventory';
  if (pathname === '/purchasing') return 'purchasing';
  if (pathname === '/reports') return 'reports';
  if (pathname === '/settings') return 'settings';
  return pathname.slice(1).replace('/', '-');
}
