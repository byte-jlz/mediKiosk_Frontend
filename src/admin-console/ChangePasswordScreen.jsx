import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import logoFull from '../assets/logo-full.png';
import LobbyArtPanel from './LobbyArtPanel';
import { changeStaffPassword, getCurrentStaff, homeFor, staffLogout } from '../services/authService';
import './AdminLoginScreen.css';

/** Shown right after a first sign-in with a temporary password (and reachable any time to change it). */
export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const staff = getCurrentStaff();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('The new password must be at least 8 characters.');
    if (next !== confirm) return setError('The new passwords do not match.');
    setLoading(true);
    try {
      await changeStaffPassword(current, next);
      navigate(homeFor(getCurrentStaff()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    await staffLogout();
    navigate('/sign-in');
  }

  return (
    <div className="mk-alogin">
      <div className="mk-alogin__art"><LobbyArtPanel /></div>
      <div className="mk-alogin__body">
        <h1 className="mk-alogin__logo"><img src={logoFull} alt="MediKiosk" /></h1>
        <p className="mk-alogin__welcome">Staff console</p>
        <form className="mk-alogin__form" onSubmit={handleSubmit}>
          <p className="mk-alogin__hint">
            {staff?.mustChangePassword
              ? 'You signed in with a temporary password. Please choose your own before continuing.'
              : 'Choose a new password.'}
          </p>
          <label className="mk-alogin__field">
            <span>{staff?.mustChangePassword ? 'TEMPORARY PASSWORD' : 'CURRENT PASSWORD'}</span>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </label>
          <label className="mk-alogin__field">
            <span>NEW PASSWORD</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </label>
          <label className="mk-alogin__field">
            <span>CONFIRM NEW PASSWORD</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
          {error && <p className="mk-alogin__error">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'SAVING…' : 'SAVE PASSWORD'}</Button>
          <p className="mk-alogin__hint">
            <button type="button" className="mk-alogin__link" onClick={handleCancel}>Sign out instead</button>
          </p>
        </form>
      </div>
    </div>
  );
}