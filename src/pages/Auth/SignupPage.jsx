/**
 * Signup Page
 * The Bharmals Kitchen — Restaurant Management System
 */

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../firebase/config';
import { AlertCircle, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

export default function SignupPage() {
  const { signUp, signInWithGoogle, error, clearError, loading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const handleGoogleSignUp = async () => {
    setFormError('');
    clearError();
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setFormError(err.message || 'Google sign-up failed');
    }
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError('');
      clearError();

      if (!displayName.trim()) {
        setFormError('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setFormError('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }

      try {
        await signUp(email.trim(), password, displayName.trim());
        navigate('/order');
      } catch (err) {
        setFormError(err.message);
      }
    },
    [displayName, email, password, confirmPassword, signUp, navigate, clearError]
  );

  const displayError = formError || error;

  if (isDemoMode) {
    return <><h2>Local Demo</h2><p className="auth-card-subtitle">Account creation needs Firebase. Choose Customer on the demo sign-in page.</p><Link to="/login" className="btn btn-primary w-full">Go to Demo Sign-In</Link></>;
  }

  return (
    <>
      <h2>Create Account</h2>
      <p className="auth-card-subtitle">Join The Bharmals Kitchen online ordering & portal</p>

      {/* Google Sign-up Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
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
        Sign up with Google
      </button>

      <div className="auth-divider" style={{ margin: 'var(--space-3) 0' }}>or continue with email</div>

      {displayError && (
        <div className="auth-error">
          <AlertCircle size={16} />
          <span>{displayError}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="signup-name">Full Name</label>
          <div className="search-box">
            <User size={18} className="search-icon" />
            <input
              id="signup-name"
              type="text"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="Your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-email">Email Address</label>
          <div className="search-box">
            <Mail size={18} className="search-icon" />
            <input
              id="signup-email"
              type="email"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-password">Password</label>
          <div style={{ position: 'relative' }}>
            <div className="search-box">
              <Lock size={18} className="search-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingLeft: '40px', paddingRight: '44px' }}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-icon btn-ghost"
              style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)' }}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="signup-confirm">Confirm Password</label>
          <div className="search-box">
            <Lock size={18} className="search-icon" />
            <input
              id="signup-confirm"
              type="password"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner spinner-sm" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="auth-divider">or</div>

      <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
