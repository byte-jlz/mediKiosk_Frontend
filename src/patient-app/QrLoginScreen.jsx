import { useNavigate } from 'react-router-dom';
import PhoneShell from './PhoneShell';
import { patientLoginWithQr } from '../services/authService';
import './QrLoginScreen.css';

export default function QrLoginScreen() {
  const navigate = useNavigate();

  async function handleScanned() {
    // In the real app, a QR scan event would trigger this with the scanned token.
    await patientLoginWithQr('demo-qr-token');
    navigate('/app/vitals-home');
  }

  return (
    <PhoneShell dark>
      <div className="mk-qr">
        <button className="mk-qr__back" onClick={() => navigate(-1)} aria-label="Go back">
          ←
        </button>

        <div className="mk-qr__code" onClick={handleScanned} role="button" tabIndex={0}>
          <QrPattern />
        </div>

        <h1 className="mk-qr__title">Log in with QR Code</h1>
        <p className="mk-qr__subtitle">
          Sign this with Medi-Kiosk mobile app to log in instantly
        </p>
        <p className="mk-qr__hint">(Tap the code to simulate a scan)</p>
      </div>
    </PhoneShell>
  );
}

function QrPattern() {
  // Decorative placeholder QR-style grid — purely visual, not a real scannable code.
  const cells = Array.from({ length: 121 }, (_, i) => i);
  return (
    <svg viewBox="0 0 121 121" className="mk-qr__svg">
      {cells.map((i) => {
        const x = i % 11;
        const y = Math.floor(i / 11);
        const isFinder =
          (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
        const filled = isFinder ? true : Math.random() > 0.52;
        if (!filled) return null;
        return (
          <rect key={i} x={x * 11} y={y * 11} width="10" height="10" rx="1.5" fill="#14243a" />
        );
      })}
    </svg>
  );
}
