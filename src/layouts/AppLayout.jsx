/**
 * App Layout — Main Application Shell
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Wraps authenticated pages with Sidebar + TopBar.
 */

import { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isStaffOnly, isInventoryOnly, isBillingEnabled, isOperationsEnabled, isCustomerTakeawayEnabled, isDemoMode, isFinanceEnabled } from '../firebase/config';
import { getInventorySyncState } from '../services/dataService';
import { BILLING_RELEASE_ROLES, BILLING_RELEASE_ROUTES, INVENTORY_HOME, INVENTORY_RELEASE_ROUTES, OPERATIONS_RELEASE_ROUTES, FINANCE_RELEASE_ROLES, FINANCE_RELEASE_ROUTES, inventoryReleaseTabForPath } from '../constants/inventoryRelease';
import { PERMISSIONS, ROLES } from '../constants/roles';
import Sidebar from '../components/Sidebar/Sidebar';
import TopBar from '../components/TopBar/TopBar';
import './AppLayout.css';
import { businessPath, staffPath } from '../tenancy/paths';
import { useRestaurant } from '../tenancy/RestaurantProvider';
import usePrintWorker from '../hooks/usePrintWorker';
import useStaffAlerts from '../hooks/useStaffAlerts';

export default function AppLayout() {
  usePrintWorker();
  useStaffAlerts();
  const { user, isCustomer, loading, role, hasPermission, isTabAllowed, signOut } = useAuth();
  const location = useLocation();
  const pathname = businessPath(location.pathname);
  const restaurant = useRestaurant();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inventorySync, setInventorySync] = useState(getInventorySyncState);

  useEffect(() => {
    if (!isInventoryOnly || isDemoMode) return undefined;
    const update = (event) => setInventorySync(event.detail);
    window.addEventListener('tbk_inventory_sync_state', update);
    setInventorySync(getInventorySyncState());
    return () => window.removeEventListener('tbk_inventory_sync_state', update);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Show loading screen while auth initializes
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
          Loading {restaurant.name}...
        </p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={staffPath('/login')} replace />;
  }

  // Redirect customers to customer order page
  if (isCustomer) {
    return <Navigate to={isStaffOnly && !isCustomerTakeawayEnabled ? '/access-pending' : '/order'} replace />;
  }

  if (isInventoryOnly && !isDemoMode && !inventorySync.ready) {
    return (
      <div className="loading-screen">
        {inventorySync.error ? (
          <>
            <h2>Inventory could not be synchronized</h2>
            <p>{inventorySync.error} Check your connection and access, then reload this page.</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
              <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
            </div>
          </>
        ) : (
          <><div className="spinner" /><p>Loading {restaurant.name}...</p></>
        )}
      </div>
    );
  }

  if (isInventoryOnly) {
    const operationsPath = isOperationsEnabled && OPERATIONS_RELEASE_ROUTES.has(pathname);
    const financePath = isFinanceEnabled && FINANCE_RELEASE_ROUTES.has(pathname);
    if (!INVENTORY_RELEASE_ROUTES.has(pathname) && !(isBillingEnabled && BILLING_RELEASE_ROUTES.has(pathname)) && !operationsPath && !financePath) {
      return <Navigate to={INVENTORY_HOME} replace />;
    }
    const billingPath = isBillingEnabled && BILLING_RELEASE_ROUTES.has(pathname) && !operationsPath;
    const tab = billingPath && (pathname === '/pos' || pathname.startsWith('/orders'))
      ? (pathname === '/pos' ? 'pos' : pathname === '/orders' ? 'orders' : 'orders-history')
      : operationsPath && pathname.startsWith('/kitchen')
        ? (pathname === '/kitchen' ? 'kitchen' : inventoryReleaseTabForPath(pathname))
      : inventoryReleaseTabForPath(pathname);
    const requiredPermission = financePath
      ? pathname.startsWith('/reports') ? PERMISSIONS.VIEW_REPORTS : PERMISSIONS.VIEW_FINANCIALS
      : operationsPath
      ? pathname.startsWith('/kitchen') ? PERMISSIONS.VIEW_KITCHEN : PERMISSIONS.CREATE_ORDER
      : billingPath
      ? pathname.startsWith('/printing') ? PERMISSIONS.MANAGE_PRINTERS
        : pathname.startsWith('/settings')
        ? PERMISSIONS.MANAGE_USERS
        : pathname.startsWith('/menu')
        ? PERMISSIONS.MANAGE_MENU
        : pathname === '/inventory/recipes'
          ? PERMISSIONS.MANAGE_RECIPE
          : PERMISSIONS.CREATE_ORDER
      : pathname.startsWith('/purchasing')
      ? PERMISSIONS.MANAGE_PURCHASE
      : pathname.startsWith('/reports')
        ? PERMISSIONS.VIEW_REPORTS
        : pathname.startsWith('/settings')
          ? PERMISSIONS.MANAGE_USERS
          : PERMISSIONS.MANAGE_INVENTORY;
    const authorized = hasPermission(requiredPermission)
      && isTabAllowed(tab)
      && (!financePath || FINANCE_RELEASE_ROLES.has(role))
      && (!billingPath || BILLING_RELEASE_ROLES.has(role))
      && (!operationsPath || [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.CHEF, ROLES.KITCHEN_STAFF].includes(role))
      && (!pathname.startsWith('/settings') || [ROLES.OWNER, ROLES.ADMIN].includes(role));
    if (!authorized) {
      return (
        <div className="loading-screen">
          <h2>Access is not assigned</h2>
          <p>Ask the owner to assign the required role and tabs to this account.</p>
          <button className="btn btn-primary" onClick={signOut}>Sign out</button>
        </div>
      );
    }
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />
      <TopBar onMobileMenuToggle={toggleMobileMenu} />
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
