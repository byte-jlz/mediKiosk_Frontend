import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneShell from './PhoneShell';
import Button from '../components/Button';
import { patientLogin } from '../services/authService';
import './AuthForm.css';

export default function SignInScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      await patientLogin(email, password);
      navigate('/app/vitals-home');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhoneShell>
      <div className="mk-auth">
        <div className="mk-auth__brand">
          <h1 className="mk-auth__logo">MEDI-KIOSK</h1>
          <p className="mk-auth__tagline">Welcome back. Sign in to continue</p>
        </div>

        <form className="mk-auth__form" onSubmit={handleSubmit}>
          <label className="mk-field">
            <span className="mk-field__icon">✉</span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="mk-field">
            <span className="mk-field__icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="mk-auth__error">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="mk-auth__footer">
            <p>Don't have an account?</p>
            <button type="button" className="mk-auth__alt" onClick={() => navigate('/app/sign-up')}>
              Create account
            </button>
          </div>
        </form>
      </div>
    </PhoneShell>
  );
}
