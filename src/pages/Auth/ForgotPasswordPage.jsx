/**
 * Forgot Password Page
 * The Bharmals Kitchen — Restaurant Management System
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../firebase/config';
import { AlertCircle, Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError('');

      if (!email.trim()) {
        setFormError('Please enter your email address.');
        return;
      }

      setLoading(true);
      try {
        await resetPassword(email.trim());
        setSent(true);
      } catch (err) {
        setFormError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [email, resetPassword]
  );

  if (isDemoMode) {
    return <><h2>Local Demo</h2><p className="auth-card-subtitle">Password reset needs Firebase. Choose a demo role to explore the app.</p><Link to="/login" className="btn btn-primary w-full">Go to Demo Sign-In</Link></>;
  }

  if (sent) {
    return (
      <>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-full)',
            background: 'var(--color-success-bg)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)',
          }}>
            <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2>Check Your Email</h2>
          <p className="auth-card-subtitle">
            We've sent a password reset link to <strong>{email}</strong>.
            Check your inbox and follow the instructions.
          </p>
        </div>
        <div style={{ marginTop: 'var(--space-6)' }}>
          <Link to="/login" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Reset Password</h2>
      <p className="auth-card-subtitle">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {formError && (
        <div className="auth-error">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="reset-email">Email Address</label>
          <div className="search-box">
            <Mail size={18} className="search-icon" />
            <input
              id="reset-email"
              type="email"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner spinner-sm" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
        <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={14} />
          Back to Sign In
        </Link>
      </div>
    </>
  );
}
