/**
 * Navigation Configuration
 * The Bharmals Kitchen — Restaurant Management System
 */

import { PERMISSIONS } from './roles';

/**
 * Main sidebar navigation structure.
 * Each item specifies required permissions — the sidebar
 * only renders items the current user is authorized to see.
 *
 * Icon names reference lucide-react icon components.
 */
export const NAVIGATION = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    permissions: [PERMISSIONS.VIEW_DASHBOARD],
  },
  {
    id: 'pos',
    label: 'POS',
    path: '/pos',
    icon: 'ShoppingCart',
    permissions: [PERMISSIONS.CREATE_ORDER],
  },
  {
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    icon: 'ClipboardList',
    permissions: [PERMISSIONS.CREATE_ORDER],
    children: [
      { id: 'orders-active', label: 'Active Orders', path: '/orders/active' },
      { id: 'orders-history', label: 'Order History', path: '/orders/history' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    path: '/kitchen',
    icon: 'ChefHat',
    permissions: [PERMISSIONS.VIEW_KITCHEN],
    children: [
      { id: 'kitchen-kds', label: 'Kitchen Display', path: '/kitchen/kds' },
      { id: 'kitchen-kot', label: 'KOT', path: '/kitchen/kot' },
    ],
  },
  {
    id: 'tables',
    label: 'Tables',
    path: '/tables',
    icon: 'Grid3X3',
    permissions: [PERMISSIONS.MANAGE_TABLES],
    children: [
      { id: 'tables-floor', label: 'Floor Plan', path: '/tables/floor' },
      { id: 'tables-reservations', label: 'Reservations', path: '/tables/reservations' },
      { id: 'tables-waitlist', label: 'Waitlist', path: '/tables/waitlist' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    path: '/menu',
    icon: 'UtensilsCrossed',
    permissions: [PERMISSIONS.MANAGE_MENU],
    children: [
      { id: 'menu-items', label: 'Menu Items', path: '/menu/items' },
      { id: 'menu-categories', label: 'Categories', path: '/menu/categories' },
      { id: 'menu-modifiers', label: 'Modifiers', path: '/menu/modifiers' },
      { id: 'menu-combos', label: 'Combos', path: '/menu/combos' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    icon: 'Package',
    permissions: [PERMISSIONS.MANAGE_INVENTORY],
    children: [
      { id: 'inventory-materials', label: 'Raw Materials', path: '/inventory/materials' },
      { id: 'inventory-recipes', label: 'Recipes', path: '/inventory/recipes' },
      { id: 'inventory-stock', label: 'Stock Ledger', path: '/inventory/stock' },
      { id: 'inventory-wastage', label: 'Wastage', path: '/inventory/wastage' },
      { id: 'inventory-count', label: 'Stock Count', path: '/inventory/count' },
      { id: 'inventory-utensils', label: 'Utensils', path: '/inventory/utensils' },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    path: '/purchasing',
    icon: 'Truck',
    permissions: [PERMISSIONS.MANAGE_PURCHASE],
    children: [
      { id: 'purchasing-bills', label: 'Purchase Bills', path: '/purchasing/bills' },
      { id: 'purchasing-orders', label: 'Purchase Orders', path: '/purchasing/orders' },
      { id: 'purchasing-suppliers', label: 'Suppliers', path: '/purchasing/suppliers' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    path: '/customers',
    icon: 'Users',
    permissions: [PERMISSIONS.MANAGE_CUSTOMERS],
    children: [
      { id: 'customers-list', label: 'Customer List', path: '/customers/list' },
      { id: 'customers-inbox', label: 'Inquiries & Inbox', path: '/customers/inbox' },
      { id: 'customers-loyalty', label: 'Loyalty', path: '/customers/loyalty' },
      { id: 'customers-promotions', label: 'Promotions', path: '/customers/promotions' },
    ],
  },
  {
    id: 'staff',
    label: 'Staff',
    path: '/staff',
    icon: 'UserCog',
    permissions: [PERMISSIONS.MANAGE_STAFF],
    children: [
      { id: 'staff-list', label: 'Staff List', path: '/staff/list' },
      { id: 'staff-attendance', label: 'Attendance', path: '/staff/attendance' },
      { id: 'staff-leaves', label: 'Leaves', path: '/staff/leaves' },
      { id: 'staff-payroll', label: 'Payroll', path: '/staff/payroll' },
      { id: 'staff-advances', label: 'Advances', path: '/staff/advances' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    icon: 'IndianRupee',
    permissions: [PERMISSIONS.VIEW_FINANCIALS],
    children: [
      { id: 'finance-expenses', label: 'Expenses', path: '/finance/expenses' },
      { id: 'finance-cash-drawer', label: 'Cash Drawer', path: '/finance/cash-drawer' },
      { id: 'finance-shifts', label: 'Shifts', path: '/finance/shifts' },
      { id: 'finance-day-close', label: 'Day Close', path: '/finance/day-close' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: 'BarChart3',
    permissions: [PERMISSIONS.VIEW_REPORTS],
    children: [
      { id: 'reports-sales', label: 'Sales', path: '/reports/sales' },
      { id: 'reports-orders', label: 'Orders', path: '/reports/orders' },
      { id: 'reports-inventory', label: 'Inventory', path: '/reports/inventory' },
      { id: 'reports-food-cost', label: 'Food Cost', path: '/reports/food-cost' },
      { id: 'reports-staff', label: 'Staff', path: '/reports/staff' },
      { id: 'reports-profit', label: 'Profitability', path: '/reports/profit' },
      { id: 'reports-tax', label: 'Tax Reports', path: '/reports/tax' },
    ],
  },
  {
    id: 'printing',
    label: 'Printing',
    path: '/printing',
    icon: 'Printer',
    permissions: [PERMISSIONS.MANAGE_PRINTERS],
    children: [
      { id: 'printing-printers', label: 'Printers', path: '/printing/printers' },
      { id: 'printing-templates', label: 'Receipt Designer', path: '/printing/templates' },
      { id: 'printing-routing', label: 'Print Routing', path: '/printing/routing' },
      { id: 'printing-queue', label: 'Print Queue', path: '/printing/queue' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    permissions: [PERMISSIONS.MANAGE_SETTINGS],
    children: [
      { id: 'settings-restaurant', label: 'Restaurant', path: '/settings/restaurant' },
      { id: 'settings-branches', label: 'Branches', path: '/settings/branches' },
      { id: 'settings-pos', label: 'POS Settings', path: '/settings/pos' },
      { id: 'settings-tax', label: 'Tax', path: '/settings/tax' },
      { id: 'settings-users', label: 'Users & Roles', path: '/settings/users' },
      { id: 'settings-notifications', label: 'Notifications', path: '/settings/notifications' },
      { id: 'settings-audit', label: 'Audit Logs', path: '/settings/audit' },
    ],
  },
];
