/**
 * Application Router
 * The Bharmals Kitchen — Restaurant Management System
 *
 * All routes are lazy-loaded for optimal code splitting.
 * Protected routes are wrapped in AppLayout (auth guard).
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { isStaffOnly, isInventoryOnly, isBillingEnabled } from '../firebase/config';
import { INVENTORY_HOME } from '../constants/inventoryRelease';

// ─── Lazy-loaded Pages ─────────────────────────────────────

// Customer Pages
const CustomerOrderPage = lazy(() => import('../pages/Customer/CustomerOrderPage'));
const CustomerTrackOrderPage = lazy(() => import('../pages/Customer/CustomerTrackOrderPage'));

// Auth
const LoginPage = lazy(() => import('../pages/Auth/LoginPage'));
const SignupPage = lazy(() => import('../pages/Auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/Auth/ForgotPasswordPage'));

// Inbox
const InboxPage = lazy(() => import('../pages/Customers/InboxPage'));

// Dashboard
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'));

// POS
const POSPage = lazy(() => import('../pages/POS/POSPage'));

// Orders
const ActiveOrdersPage = lazy(() => import('../pages/Orders/ActiveOrdersPage'));
const OrderHistoryPage = lazy(() => import('../pages/Orders/OrderHistoryPage'));

// Kitchen
const KDSPage = lazy(() => import('../pages/Kitchen/KDSPage'));
const KOTPage = lazy(() => import('../pages/Kitchen/KOTPage'));

// Tables
const FloorPlanPage = lazy(() => import('../pages/Tables/FloorPlanPage'));
const ReservationsPage = lazy(() => import('../pages/Tables/ReservationsPage'));
const WaitlistPage = lazy(() => import('../pages/Tables/WaitlistPage'));

// Menu
const MenuItemsPage = lazy(() => import('../pages/Menu/MenuItemsPage'));
const CategoriesPage = lazy(() => import('../pages/Menu/CategoriesPage'));
const ModifiersPage = lazy(() => import('../pages/Menu/ModifiersPage'));
const CombosPage = lazy(() => import('../pages/Menu/CombosPage'));

// Inventory
const RawMaterialsPage = lazy(() => import('../pages/Inventory/RawMaterialsPage'));
const RecipesPage = lazy(() => import('../pages/Inventory/RecipesPage'));
const StockLedgerPage = lazy(() => import('../pages/Inventory/StockLedgerPage'));
const WastagePage = lazy(() => import('../pages/Inventory/WastagePage'));
const StockCountPage = lazy(() => import('../pages/Inventory/StockCountPage'));
const UtensilsPage = lazy(() => import('../pages/Inventory/UtensilsPage'));

// Purchasing
const SuppliersPage = lazy(() => import('../pages/Purchasing/SuppliersPage'));
const PurchaseOrdersPage = lazy(() => import('../pages/Purchasing/PurchaseOrdersPage'));
const PurchaseBillsPage = lazy(() => import('../pages/Purchasing/PurchaseBillsPage'));

// Customers
const CustomerListPage = lazy(() => import('../pages/Customers/CustomerListPage'));
const LoyaltyPage = lazy(() => import('../pages/Customers/LoyaltyPage'));
const PromotionsPage = lazy(() => import('../pages/Customers/PromotionsPage'));

// Staff
const StaffListPage = lazy(() => import('../pages/Staff/StaffListPage'));
const AttendancePage = lazy(() => import('../pages/Staff/AttendancePage'));
const LeavesPage = lazy(() => import('../pages/Staff/LeavesPage'));
const AdvancesPage = lazy(() => import('../pages/Staff/AdvancesPage'));
const PayrollPage = lazy(() => import('../pages/Staff/PayrollPage'));

// Finance
const ExpensesPage = lazy(() => import('../pages/Finance/ExpensesPage'));
const CashDrawerPage = lazy(() => import('../pages/Finance/CashDrawerPage'));
const ShiftsPage = lazy(() => import('../pages/Finance/ShiftsPage'));
const DayClosePage = lazy(() => import('../pages/Finance/DayClosePage'));

// Reports
const SalesReportPage = lazy(() => import('../pages/Reports/SalesReportPage'));
const OrderReportsPage = lazy(() => import('../pages/Reports/OrderReportsPage'));
const InventoryReportsPage = lazy(() => import('../pages/Reports/InventoryReportsPage'));
const FoodCostReportsPage = lazy(() => import('../pages/Reports/FoodCostReportsPage'));
const StaffReportsPage = lazy(() => import('../pages/Reports/StaffReportsPage'));
const ProfitReportsPage = lazy(() => import('../pages/Reports/ProfitReportsPage'));
const TaxReportsPage = lazy(() => import('../pages/Reports/TaxReportsPage'));

// Printing
const PrintersPage = lazy(() => import('../pages/Printing/PrintersPage'));
const ReceiptDesignerPage = lazy(() => import('../pages/Printing/ReceiptDesignerPage'));
const PrintRoutingPage = lazy(() => import('../pages/Printing/PrintRoutingPage'));
const PrintQueuePage = lazy(() => import('../pages/Printing/PrintQueuePage'));

// Settings
const RestaurantSettingsPage = lazy(() => import('../pages/Settings/RestaurantSettingsPage'));
const BranchesPage = lazy(() => import('../pages/Settings/BranchesPage'));
const POSSettingsPage = lazy(() => import('../pages/Settings/POSSettingsPage'));
const TaxSettingsPage = lazy(() => import('../pages/Settings/TaxSettingsPage'));
const UsersRolesPage = lazy(() => import('../pages/Settings/UsersRolesPage'));
const NotificationsSettingsPage = lazy(() => import('../pages/Settings/NotificationsSettingsPage'));
const AuditLogsPage = lazy(() => import('../pages/Settings/AuditLogsPage'));

// ─── Loading Fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
    }}>
      <div className="spinner" />
    </div>
  );
}

function SuspenseWrap({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── Smart Root Redirector ─────────────────────────────────
function RootRoute() {
  const { user, isCustomer, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={isStaffOnly ? '/login' : '/order'} replace />;
  if (isCustomer) return <Navigate to={isStaffOnly ? '/access-pending' : '/order'} replace />;
  return <Navigate to={isInventoryOnly ? INVENTORY_HOME : '/dashboard'} replace />;
}

function StaffOnlyRoute({ children }) {
  const { user, isCustomer, loading } = useAuth();
  if (!isStaffOnly) return children;
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isCustomer) return <Navigate to="/access-pending" replace />;
  return <Navigate to={isInventoryOnly ? INVENTORY_HOME : '/dashboard'} replace />;
}

function AccessPendingRoute() {
  const { user, isCustomer, loading, signOut } = useAuth();
  if (!isStaffOnly) return <Navigate to="/order" replace />;
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isCustomer) return <Navigate to={isInventoryOnly ? INVENTORY_HOME : '/dashboard'} replace />;
  return (
    <div className="loading-screen">
      <h2>Staff access is pending</h2>
      <p>Your account is signed in but has not been assigned a staff role. Ask an administrator to grant access.</p>
      <button className="btn btn-primary" onClick={signOut}>Sign out</button>
    </div>
  );
}

// ─── Router Definition ─────────────────────────────────────
export const router = createBrowserRouter([
  // Customer Online Ordering & Tracking (Public/Google Login)
  { path: '/order', element: <StaffOnlyRoute><SuspenseWrap><CustomerOrderPage /></SuspenseWrap></StaffOnlyRoute> },
  { path: '/track/:orderId', element: <StaffOnlyRoute><SuspenseWrap><CustomerTrackOrderPage /></SuspenseWrap></StaffOnlyRoute> },
  { path: '/track', element: <StaffOnlyRoute><SuspenseWrap><CustomerTrackOrderPage /></SuspenseWrap></StaffOnlyRoute> },
  { path: '/access-pending', element: <AccessPendingRoute /> },

  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <SuspenseWrap><LoginPage /></SuspenseWrap> },
      { path: '/signup', element: isStaffOnly ? <Navigate to="/login" replace /> : <SuspenseWrap><SignupPage /></SuspenseWrap> },
      { path: '/forgot-password', element: <SuspenseWrap><ForgotPasswordPage /></SuspenseWrap> },
    ],
  },

  // Protected app routes
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <SuspenseWrap><DashboardPage /></SuspenseWrap> },

      // POS
      { path: '/pos', element: <SuspenseWrap><POSPage /></SuspenseWrap> },

      // Orders
      { path: '/orders', element: <Navigate to={isInventoryOnly && isBillingEnabled ? '/orders/history' : '/orders/active'} replace /> },
      { path: '/orders/active', element: <SuspenseWrap><ActiveOrdersPage /></SuspenseWrap> },
      { path: '/orders/history', element: <SuspenseWrap><OrderHistoryPage /></SuspenseWrap> },

      // Kitchen
      { path: '/kitchen', element: <Navigate to="/kitchen/kds" replace /> },
      { path: '/kitchen/kds', element: <SuspenseWrap><KDSPage /></SuspenseWrap> },
      { path: '/kitchen/kot', element: <SuspenseWrap><KOTPage /></SuspenseWrap> },

      // Tables
      { path: '/tables', element: <Navigate to="/tables/floor" replace /> },
      { path: '/tables/floor', element: <SuspenseWrap><FloorPlanPage /></SuspenseWrap> },
      { path: '/tables/reservations', element: <SuspenseWrap><ReservationsPage /></SuspenseWrap> },
      { path: '/tables/waitlist', element: <SuspenseWrap><WaitlistPage /></SuspenseWrap> },

      // Menu
      { path: '/menu', element: <Navigate to="/menu/items" replace /> },
      { path: '/menu/items', element: <SuspenseWrap><MenuItemsPage /></SuspenseWrap> },
      { path: '/menu/categories', element: <SuspenseWrap><CategoriesPage /></SuspenseWrap> },
      { path: '/menu/modifiers', element: <SuspenseWrap><ModifiersPage /></SuspenseWrap> },
      { path: '/menu/combos', element: <SuspenseWrap><CombosPage /></SuspenseWrap> },

      // Inventory
      { path: '/inventory', element: <Navigate to="/inventory/materials" replace /> },
      { path: '/inventory/materials', element: <SuspenseWrap><RawMaterialsPage /></SuspenseWrap> },
      { path: '/inventory/recipes', element: <SuspenseWrap><RecipesPage /></SuspenseWrap> },
      { path: '/inventory/stock', element: <SuspenseWrap><StockLedgerPage /></SuspenseWrap> },
      { path: '/inventory/wastage', element: <SuspenseWrap><WastagePage /></SuspenseWrap> },
      { path: '/inventory/count', element: <SuspenseWrap><StockCountPage /></SuspenseWrap> },
      { path: '/inventory/utensils', element: <SuspenseWrap><UtensilsPage /></SuspenseWrap> },

      // Purchasing
      { path: '/purchasing', element: <Navigate to="/purchasing/bills" replace /> },
      { path: '/purchasing/bills', element: <SuspenseWrap><PurchaseBillsPage /></SuspenseWrap> },
      { path: '/purchasing/orders', element: <SuspenseWrap><PurchaseOrdersPage /></SuspenseWrap> },
      { path: '/purchasing/suppliers', element: <SuspenseWrap><SuppliersPage /></SuspenseWrap> },

      // Customers
      { path: '/customers', element: <Navigate to="/customers/list" replace /> },
      { path: '/customers/list', element: <SuspenseWrap><CustomerListPage /></SuspenseWrap> },
      { path: '/customers/inbox', element: <SuspenseWrap><InboxPage /></SuspenseWrap> },
      { path: '/customers/loyalty', element: <SuspenseWrap><LoyaltyPage /></SuspenseWrap> },
      { path: '/customers/promotions', element: <SuspenseWrap><PromotionsPage /></SuspenseWrap> },

      // Staff
      { path: '/staff', element: <Navigate to="/staff/list" replace /> },
      { path: '/staff/list', element: <SuspenseWrap><StaffListPage /></SuspenseWrap> },
      { path: '/staff/attendance', element: <SuspenseWrap><AttendancePage /></SuspenseWrap> },
      { path: '/staff/leaves', element: <SuspenseWrap><LeavesPage /></SuspenseWrap> },
      { path: '/staff/payroll', element: <SuspenseWrap><PayrollPage /></SuspenseWrap> },
      { path: '/staff/advances', element: <SuspenseWrap><AdvancesPage /></SuspenseWrap> },

      // Finance
      { path: '/finance', element: <Navigate to="/finance/expenses" replace /> },
      { path: '/finance/expenses', element: <SuspenseWrap><ExpensesPage /></SuspenseWrap> },
      { path: '/finance/cash-drawer', element: <SuspenseWrap><CashDrawerPage /></SuspenseWrap> },
      { path: '/finance/shifts', element: <SuspenseWrap><ShiftsPage /></SuspenseWrap> },
      { path: '/finance/day-close', element: <SuspenseWrap><DayClosePage /></SuspenseWrap> },

      // Reports
      { path: '/reports', element: <Navigate to={isInventoryOnly ? '/reports/inventory' : '/reports/sales'} replace /> },
      { path: '/reports/sales', element: <SuspenseWrap><SalesReportPage /></SuspenseWrap> },
      { path: '/reports/orders', element: <SuspenseWrap><OrderReportsPage /></SuspenseWrap> },
      { path: '/reports/inventory', element: <SuspenseWrap><InventoryReportsPage /></SuspenseWrap> },
      { path: '/reports/food-cost', element: <SuspenseWrap><FoodCostReportsPage /></SuspenseWrap> },
      { path: '/reports/staff', element: <SuspenseWrap><StaffReportsPage /></SuspenseWrap> },
      { path: '/reports/profit', element: <SuspenseWrap><ProfitReportsPage /></SuspenseWrap> },
      { path: '/reports/tax', element: <SuspenseWrap><TaxReportsPage /></SuspenseWrap> },

      // Printing
      { path: '/printing', element: <Navigate to="/printing/printers" replace /> },
      { path: '/printing/printers', element: <SuspenseWrap><PrintersPage /></SuspenseWrap> },
      { path: '/printing/templates', element: <SuspenseWrap><ReceiptDesignerPage /></SuspenseWrap> },
      { path: '/printing/routing', element: <SuspenseWrap><PrintRoutingPage /></SuspenseWrap> },
      { path: '/printing/queue', element: <SuspenseWrap><PrintQueuePage /></SuspenseWrap> },

      // Settings
      { path: '/settings', element: <Navigate to={isInventoryOnly ? '/settings/users' : '/settings/restaurant'} replace /> },
      { path: '/settings/restaurant', element: <SuspenseWrap><RestaurantSettingsPage /></SuspenseWrap> },
      { path: '/settings/branches', element: <SuspenseWrap><BranchesPage /></SuspenseWrap> },
      { path: '/settings/pos', element: <SuspenseWrap><POSSettingsPage /></SuspenseWrap> },
      { path: '/settings/tax', element: <SuspenseWrap><TaxSettingsPage /></SuspenseWrap> },
      { path: '/settings/users', element: <SuspenseWrap><UsersRolesPage /></SuspenseWrap> },
      { path: '/settings/notifications', element: <SuspenseWrap><NotificationsSettingsPage /></SuspenseWrap> },
      { path: '/settings/audit', element: <SuspenseWrap><AuditLogsPage /></SuspenseWrap> },
    ],
  },

  // Root redirect (Smart: customers/new users go to /order, staff to /dashboard)
  { path: '/', element: <RootRoute /> },

  // Catch-all 404
  {
    path: '*',
    element: (
      <div className="loading-screen">
        <h2 style={{ color: 'var(--text-primary)' }}>404 — Page Not Found</h2>
        <p style={{ color: 'var(--text-tertiary)' }}>
          The page you're looking for doesn't exist.
        </p>
        <a href={isInventoryOnly ? INVENTORY_HOME : '/dashboard'} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Go to {isInventoryOnly ? 'Inventory' : 'Dashboard'}
        </a>
      </div>
    ),
  },
]);
