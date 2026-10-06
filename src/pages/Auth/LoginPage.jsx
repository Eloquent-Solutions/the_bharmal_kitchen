/**
 * Login Page
 * The Bharmals Kitchen — Restaurant Management System
 */

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode, isStaffOnly } from '../../firebase/config';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  Shield,
  ChefHat,
  CreditCard,
  UtensilsCrossed,
} from 'lucide-react';

export default function LoginPage() {
  const { signIn, signInWithGoogle, loginDemo, error, clearError, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const handleGoogleSignIn = async () => {
    setFormError('');
    clearError();
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setFormError(err.message || 'Google sign-in failed');
    }
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError('');
      clearError();

      if (!email.trim()) {
        setFormError('Please enter your email address.');
        return;
      }
      if (!password) {
        setFormError('Please enter your password.');
        return;
      }

      try {
        await signIn(email.trim(), password);
        navigate('/');
      } catch (err) {
        setFormError(err.message);
      }
    },
    [email, password, signIn, navigate, clearError]
  );

  const handleQuickDemo = (roleType) => {
    setFormError('');
    clearError();
    if (roleType === 'customer') {
      loginDemo('customer');
      navigate('/order');
    } else {
      loginDemo(roleType);
      navigate('/dashboard');
    }
  };

  const displayError = formError || error;

  return (
    <>
      <h2>Welcome Back</h2>
      <p className="auth-card-subtitle">{isDemoMode ? 'Explore the app locally with a demo role' : isStaffOnly ? 'Staff sign-in' : 'Sign in to The Bharmals Kitchen portal'}</p>

      {/* Google Sign-In Button */}
      {!isDemoMode && <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="btn w-full"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          height: '44px',
          fontSize: 'var(--font-sm)',
          fontWeight: '600',
          backgroundColor: '#ffffff',
          color: '#1f2937',
          border: '1px solid #d1d5db',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: 'var(--space-3)',
          cursor: 'pointer',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Sign in with Google
      </button>

      <div className="auth-divider" style={{ margin: 'var(--space-3) 0' }}>or continue with credentials</div>
      </>}

      {/* Quick 1-Click Demo Login Box */}
      {isDemoMode && (
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-xs)', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '8px' }}>
          <Sparkles size={14} /> Quick Demo Sign-In (1-Click)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
            onClick={() => handleQuickDemo('owner')}
          >
            <Shield size={13} style={{ color: 'var(--color-primary)' }} /> Owner / Admin
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
            onClick={() => handleQuickDemo('cashier')}
          >
            <CreditCard size={13} style={{ color: 'var(--color-success)' }} /> Cashier / Billing
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
            onClick={() => handleQuickDemo('chef')}
          >
            <ChefHat size={13} style={{ color: 'var(--color-warning)' }} /> Head Chef (KDS)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'flex-start' }}
            onClick={() => handleQuickDemo('customer')}
          >
            <UtensilsCrossed size={13} style={{ color: 'var(--color-info)' }} /> Customer (Order)
          </button>
        </div>
      </div>
      )}

      {displayError && (
        <div className="auth-error">
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}

      {!isDemoMode && <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">
            Email Address
          </label>
          <div className="search-box">
            <Mail size={18} className="search-icon" />
            <input
              id="login-email"
              type="email"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="owner@thebharmalskitchen.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="login-password">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <div className="search-box">
              <Lock size={18} className="search-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingLeft: '40px', paddingRight: '44px' }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="button"
              className="btn-icon btn-ghost"
              style={{
                position: 'absolute',
                right: '4px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="auth-form-footer">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary)' }} />
            Remember me
          </label>
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner spinner-sm" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>}

      {!isDemoMode && !isStaffOnly && <>
      <div className="auth-divider">or</div>

      <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link to="/signup" className="auth-link">
          Create one
        </Link>
      </p>
      </>}
    </>
  );
}
