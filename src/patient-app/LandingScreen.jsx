import { useNavigate } from 'react-router-dom';
import PhoneShell from './PhoneShell';
import Button from '../components/Button';
import DevSkipLogin from '../components/DevSkipLogin';
import './LandingScreen.css';

export default function LandingScreen() {
  const navigate = useNavigate();

  return (
    <PhoneShell>
      <div className="mk-landing">
        <div className="mk-landing__hero" aria-hidden="true" />

        <div className="mk-landing__body">
          <h1 className="mk-landing__logo">MEDI-KIOSK</h1>
          <p className="mk-landing__title">Welcome back. Sign in to continue</p>

          <div className="mk-landing__actions">
            <Button fullWidth onClick={() => navigate('/app/sign-in')}>
              Sign in
            </Button>
            <Button fullWidth variant="secondary" onClick={() => navigate('/app/sign-up')}>
              Sign up
            </Button>
          </div>

          <button className="mk-landing__qr-link" onClick={() => navigate('/app/qr-login')}>
            Log in with QR code
          </button>

          <DevSkipLogin as="patient" to="/app/vitals-home" />
        </div>
      </div>
    </PhoneShell>
  );
}
