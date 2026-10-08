/**
 * Sidebar Component
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Collapsible sidebar with permission-gated navigation,
 * nested sub-menus, and active route highlighting.
 */

import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NAVIGATION } from '../../constants/navigation';
import { BILLING_RELEASE_TABS, INVENTORY_RELEASE_TABS } from '../../constants/inventoryRelease';
import { isBillingEnabled, isInventoryOnly } from '../../firebase/config';
import { ROLES } from '../../constants/roles';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, ChefHat,
  Grid3X3, UtensilsCrossed, Package, Truck, Users,
  UserCog, IndianRupee, BarChart3, Printer, Settings,
  ChevronDown, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import './Sidebar.css';

const ICON_MAP = {
  LayoutDashboard, ShoppingCart, ClipboardList, ChefHat,
  Grid3X3, UtensilsCrossed, Package, Truck, Users,
  UserCog, IndianRupee, BarChart3, Printer, Settings,
};

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { hasAnyPermission, isTabAllowed, role } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = useCallback((id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isActive = (path) => location.pathname.startsWith(path);
  const billingRoleAllowed = [ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER].includes(role);

  // Filter top-level items by permission & admin-configured allowedTabs
  const filteredNav = NAVIGATION.filter((item) =>
    (!isInventoryOnly || INVENTORY_RELEASE_TABS.has(item.id) || (isBillingEnabled && BILLING_RELEASE_TABS.has(item.id)))
    && (!isInventoryOnly || !BILLING_RELEASE_TABS.has(item.id) || billingRoleAllowed)
    && hasAnyPermission(item.permissions)
    && isTabAllowed(item.id)
  ).map((item) => {
    if (item.children && item.children.length > 0) {
      const allowedChildren = item.children.filter((child) =>
        (!isInventoryOnly || INVENTORY_RELEASE_TABS.has(child.id) || (isBillingEnabled && BILLING_RELEASE_TABS.has(child.id)))
        && (!isInventoryOnly || !BILLING_RELEASE_TABS.has(child.id) || billingRoleAllowed)
        && isTabAllowed(child.id)
      );
      return {
        ...item,
        children: isInventoryOnly ? allowedChildren : allowedChildren.length > 0 ? allowedChildren : item.children,
      };
    }
    return item;
  }).filter((item) => !item.children || item.children.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} />
      )}

      <aside
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${
          mobileOpen ? 'sidebar-mobile-open' : ''
        }`}
      >
        {/* Header */}
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <span>TBK</span>
              </div>
              <div className="sidebar-brand-text">
                <h2>The Bharmals</h2>
                <span>Kitchen</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="sidebar-logo sidebar-logo-collapsed">
              <span>TBK</span>
            </div>
          )}

          {/* Mobile close */}
          <button
            className="sidebar-mobile-close btn-icon btn-ghost"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {filteredNav.map((item) => {
            const IconComponent = ICON_MAP[item.icon];
            const active = isActive(item.path);
            const expanded = expandedItems[item.id];
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id} className="sidebar-nav-group">
                {hasChildren ? (
                  <button
                    className={`sidebar-nav-item ${active ? 'active' : ''}`}
                    onClick={() => toggleExpand(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-nav-icon">
                      {IconComponent && <IconComponent size={20} />}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="sidebar-nav-label">{item.label}</span>
                        <ChevronDown
                          size={14}
                          className={`sidebar-nav-arrow ${expanded ? 'rotated' : ''}`}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive: linkActive }) =>
                      `sidebar-nav-item ${linkActive ? 'active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                    onClick={onMobileClose}
                  >
                    <span className="sidebar-nav-icon">
                      {IconComponent && <IconComponent size={20} />}
                    </span>
                    {!collapsed && (
                      <span className="sidebar-nav-label">{item.label}</span>
                    )}
                  </NavLink>
                )}

                {/* Sub-items */}
                {hasChildren && !collapsed && expanded && (
                  <div className="sidebar-sub-nav">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive: linkActive }) =>
                          `sidebar-sub-item ${linkActive ? 'active' : ''}`
                        }
                        onClick={onMobileClose}
                      >
                        <span className="sidebar-sub-dot" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
    </>
  );
}
