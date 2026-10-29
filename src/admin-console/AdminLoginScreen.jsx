import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DevSkipLogin from '../components/DevSkipLogin';
import { getCurrentStaff, staffLogin } from '../services/authService';
import { getStaffToken } from '../services/apiClient';
import { CLINIC_STAFF, SUPER_ADMIN, homeFor } from './adminRoles';
import LobbyArtPanel from '../kiosk-app/LobbyArtPanel';
import './AdminLoginScreen.css';

export default function AdminLoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    location.state?.expired ? 'Your session ended. Please sign in again.' : '');
  const [loading, setLoading] = useState(false);

  // Already signed in -> straight to this role's home page.
  const current = getCurrentStaff();
  if (getStaffToken() && current.accessRole) {
    return <Navigate to={homeFor(current.accessRole)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { staff } = await staffLogin(email, password);
      navigate(homeFor(staff.accessRole), { replace: true });
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
            No account? Ask your Super Admin to create one for you.
          </p>

          <DevSkipLogin as="staff" role={CLINIC_STAFF} onError={setError} />
          <DevSkipLogin as="staff" role={SUPER_ADMIN} onError={setError} />
        </form>
      </div>
    </div>
  );
}
