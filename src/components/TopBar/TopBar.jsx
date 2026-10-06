/**
 * TopBar Component
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Top navigation bar with global search, notifications,
 * user profile dropdown, and breadcrumbs.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Search, Bell, Menu, LogOut, User, Settings,
  ChevronRight, Moon, Sun, HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './TopBar.css';

export default function TopBar({ onMobileMenuToggle }) {
  const { user, userProfile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K for search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = useCallback(async () => {
    setProfileOpen(false);
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  // Build breadcrumbs from path
  const breadcrumbs = buildBreadcrumbs(location.pathname);

  const displayName = userProfile?.displayName || user?.displayName || user?.email || 'User';
  const initials = getInitials(displayName);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile menu toggle */}
        <button
          className="topbar-menu-btn btn-icon btn-ghost"
          onClick={onMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumbs */}
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} className="breadcrumb-separator" />}
              {i < breadcrumbs.length - 1 ? (
                <button
                  className="breadcrumb-link"
                  onClick={() => navigate(crumb.path)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="topbar-right">
        {/* Global Search */}
        <div className="topbar-search">
          <button
            className="topbar-search-trigger btn-ghost btn-icon"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setTimeout(() => searchRef.current?.focus(), 100);
            }}
            title="Search (⌘K)"
          >
            <Search size={18} />
          </button>

          {searchOpen && (
            <div className="topbar-search-overlay">
              <div className="topbar-search-box glass-card-static">
                <Search size={18} className="topbar-search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search orders, menu, customers, staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="topbar-search-input"
                />
                <kbd className="topbar-search-kbd">ESC</kbd>
              </div>
              <div
                className="topbar-search-backdrop"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              />
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="topbar-notifications" ref={notifRef}>
          <button
            className="topbar-notif-btn btn-ghost btn-icon relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="notification-dot" />
          </button>

          {notificationsOpen && (
            <div className="dropdown-menu topbar-notif-dropdown">
              <div className="topbar-notif-header">
                <span className="topbar-notif-title">Notifications</span>
                <button className="btn btn-ghost btn-sm">Mark all read</button>
              </div>
              <div className="topbar-notif-list">
                <div className="topbar-notif-empty">
                  <Bell size={24} />
                  <p>No new notifications</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="topbar-profile" ref={profileRef}>
          <button
            className="topbar-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User menu"
          >
            <div className="avatar avatar-sm avatar-primary">
              <span>{initials}</span>
            </div>
            <div className="topbar-profile-info">
              <span className="topbar-profile-name">{displayName}</span>
              <span className="topbar-profile-role">{role}</span>
            </div>
          </button>

          {profileOpen && (
            <div className="dropdown-menu topbar-profile-dropdown">
              <div className="topbar-profile-dropdown-header">
                <div className="avatar avatar-primary">
                  <span>{initials}</span>
                </div>
                <div>
                  <div className="topbar-profile-name">{displayName}</div>
                  <div className="topbar-profile-email">{user?.email}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings/restaurant');
                }}
              >
                <User size={16} />
                <span>Profile</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
              <button className="dropdown-item">
                <HelpCircle size={16} />
                <span>Help & Support</span>
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item dropdown-item-danger" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function buildBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += '/' + segment;
    crumbs.push({
      label: formatSegment(segment),
      path: currentPath,
    });
  }

  return crumbs.length > 0 ? crumbs : [{ label: 'Dashboard', path: '/dashboard' }];
}

function formatSegment(segment) {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
