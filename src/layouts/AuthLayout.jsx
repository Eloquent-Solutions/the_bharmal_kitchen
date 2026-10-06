/**
 * Auth Layout — Login / Signup / Reset Password
 * The Bharmals Kitchen — Restaurant Management System
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isStaffOnly } from '../firebase/config';
import './AuthLayout.css';

export default function AuthLayout() {
  const { user, isCustomer, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  // If already authenticated, redirect to dashboard
  if (user) {
    return <Navigate to={isCustomer ? (isStaffOnly ? '/access-pending' : '/order') : '/dashboard'} replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-bg-pattern" />
      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">
            <span>TBK</span>
          </div>
          <h1 className="auth-title">The Bharmals Kitchen</h1>
          <p className="auth-subtitle">Restaurant Management System</p>
        </div>
        <div className="auth-card glass-card-static">
          <Outlet />
        </div>
        <p className="auth-footer">
          © {new Date().getFullYear()} The Bharmals Kitchen. All rights reserved.
        </p>
      </div>
    </div>
  );
}
