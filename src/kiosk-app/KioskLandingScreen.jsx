import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import LobbyArtPanel from './LobbyArtPanel';
import Button from '../components/Button';
import DevSkipLogin from '../components/DevSkipLogin';
import './KioskLandingScreen.css';

export default function KioskLandingScreen() {
  const navigate = useNavigate();

  return (
    <KioskShell split>
      <div className="mk-klanding__art">
        <LobbyArtPanel />
      </div>

      <div className="mk-klanding__body">
        <h1 className="mk-klanding__logo">Medi-Kiosk</h1>
        <p className="mk-klanding__tagline">
          Step up, sign in, and let the kiosk guide you through a complete vital
          signs scan — one reading at a time.
        </p>

        <div className="mk-klanding__actions">
          <Button variant="secondary" onClick={() => navigate('/kiosk/qr-scan')}>
            QR Code
          </Button>
          <Button variant="secondary" onClick={() => navigate('/kiosk/qr-scan')}>
            QR ID
          </Button>
        </div>

        <div className="mk-klanding__divider">
          <span />
          <p>OR</p>
          <span />
        </div>

        <button className="mk-klanding__guest" onClick={() => navigate('/kiosk/vitals')}>
          Continue as guest
        </button>

        <button className="mk-klanding__staff-link" onClick={() => navigate('/kiosk/sign-in')}>
          Sign in with email instead
        </button>

        <DevSkipLogin as="patient" to="/kiosk/vitals" />
      </div>
    </KioskShell>
  );
}
