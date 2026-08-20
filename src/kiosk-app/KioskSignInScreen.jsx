import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import LobbyArtPanel from './LobbyArtPanel';
import Button from '../components/Button';
import { patientLogin } from '../services/authService';
import './KioskSignInScreen.css';

export default function KioskSignInScreen() {
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
      navigate('/kiosk/vitals');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KioskShell split>
      <div className="mk-ksignin__art">
        <LobbyArtPanel />
      </div>

      <div className="mk-ksignin__body">
        <button className="mk-ksignin__back" onClick={() => navigate('/kiosk')} aria-label="Go back">
          ←
        </button>

        <h1 className="mk-ksignin__logo">Medi-Kiosk</h1>
        <p className="mk-ksignin__tagline">
          Step up, sign in, and let the kiosk guide you through a complete vital
          signs scan — one reading at a time.
        </p>

        <form className="mk-ksignin__form" onSubmit={handleSubmit}>
          <label className="mk-ksignin__field">
            <span>EMAIL</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="mk-ksignin__field">
            <span>PASSWORD</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="mk-ksignin__error">{error}</p>}

          <div className="mk-ksignin__actions">
            <Button type="submit" disabled={loading}>
              {loading ? 'SIGNING IN…' : 'SIGN IN'}
            </Button>
          </div>

          <div className="mk-klanding__divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/kiosk/qr-scan')}>
            QR CODE
          </Button>
        </form>
      </div>
    </KioskShell>
  );
}
