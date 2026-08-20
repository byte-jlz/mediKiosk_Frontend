import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { staffLogin } from '../services/authService';
import LobbyArtPanel from '../kiosk-app/LobbyArtPanel';
import './AdminLoginScreen.css';

export default function AdminLoginScreen() {
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
      await staffLogin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mk-alogin">
      <div className="mk-alogin__art">
        <LobbyArtPanel />
      </div>

      <div className="mk-alogin__body">
        <h1 className="mk-alogin__logo">Medi-Kiosk</h1>

        <form className="mk-alogin__form" onSubmit={handleSubmit}>
          <label className="mk-alogin__field">
            <span>EMAIL</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="mk-alogin__field">
            <span>PASSWORD</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="mk-alogin__error">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </Button>

          <p className="mk-alogin__hint">
            Demo tip: any email + password combination signs you in.
          </p>
          <p className="mk-alogin__hint">
            New admin?{' '}
            <button type="button" className="mk-alogin__link" onClick={() => navigate('/admin/signup')}>
              Sign up here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
