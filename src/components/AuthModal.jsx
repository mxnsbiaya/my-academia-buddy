import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Modal } from './Modal';

export function AuthModal({ isOpen, onClose }) {
  const { user, isConfigured, signIn, signUp, signOut, resetPassword } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    const { error } = await signIn({ email, password });
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Login failed. Please check your credentials.');
    } else {
      setSuccessMsg('Signed in successfully!');
      setTimeout(() => {
        handleClose();
      }, 700);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    const { error } = await signUp({ email, password, fullName });
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Registration failed.');
    } else {
      setSuccessMsg('Account created! Please check your email for a verification link if required.');
      setTimeout(() => {
        handleClose();
      }, 2500);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email to receive a password reset link.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Password reset request failed.');
    } else {
      setSuccessMsg('Password reset instructions have been sent to your email.');
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    await signOut();
    setSubmitting(false);
    handleClose();
  };

  if (user) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Student Account">
        <div className="auth-modal-content">
          <div className="auth-profile-summary">
            <div className="auth-avatar-circle" aria-hidden="true">
              🎓
            </div>
            <div className="auth-profile-details">
              <h4>{user.user_metadata?.full_name || 'Authenticated Student'}</h4>
              <p className="auth-profile-email">{user.email}</p>
              <span className="auth-status-pill auth-pill-success">Cloud Sync Active</span>
            </div>
          </div>

          <div className="auth-details-box">
            <p>
              Your courses, syllabus topics, check-ins, and study schedules are automatically synchronized to your Supabase cloud account.
            </p>
          </div>

          <div className="auth-actions">
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={handleSignOut}
              disabled={submitting}
            >
              {submitting ? 'Signing Out...' : 'Sign Out'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === 'login'
          ? 'Sign In to Academia Buddy'
          : mode === 'signup'
          ? 'Create Student Account'
          : 'Reset Password'
      }
    >
      <div className="auth-modal-content">
        {!isConfigured && (
          <div className="auth-unconfigured-banner">
            <span aria-hidden="true">ℹ️</span>
            <div>
              <strong>Supabase Setup Required:</strong> To enable real cloud authentication across devices, set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="auth-tab-bar" role="tablist">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setMode('signup');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            Register
          </button>
        </div>

        {errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}
        {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-login-email">Student Email</label>
              <input
                id="auth-login-email"
                type="email"
                className="form-control"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-login-pass">Password</label>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="auth-login-pass"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-signup-name">Full Name</label>
              <input
                id="auth-signup-name"
                type="text"
                className="form-control"
                placeholder="Alex Chen"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-signup-email">Student Email</label>
              <input
                id="auth-signup-email"
                type="email"
                className="form-control"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-signup-pass">Password</label>
              <input
                id="auth-signup-pass"
                type="password"
                className="form-control"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="auth-form">
            <p className="auth-description">
              Enter your student email and we will send you a password recovery link.
            </p>
            <div className="form-group">
              <label htmlFor="auth-forgot-email">Student Email</label>
              <input
                id="auth-forgot-email"
                type="email"
                className="form-control"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-form-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
              >
                Back to Sign In
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer-privacy">
          <small>
            🔒 Academic isolation guaranteed: Row Level Security restricts course and progress access solely to your account.
          </small>
        </div>
      </div>
    </Modal>
  );
}

export default AuthModal;
