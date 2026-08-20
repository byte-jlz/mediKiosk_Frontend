import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import { patientLoginWithQr } from '../services/authService';
import './KioskQrScreens.css';

export default function KioskQrDisplayScreen() {
  const navigate = useNavigate();

  async function handleConfirm() {
    await patientLoginWithQr('demo-qr-token');
    navigate('/kiosk/vitals');
  }

  return (
    <KioskShell>
      <div className="mk-kqr mk-kqr--dark">
        <button className="mk-kqr__back" onClick={() => navigate('/kiosk')} aria-label="Go back">
          ←
        </button>

        <div className="mk-kqr__code" onClick={handleConfirm} role="button" tabIndex={0}>
          <QrPattern />
        </div>

        <h2 className="mk-kqr__title">Log in with QR Code</h2>
        <p className="mk-kqr__subtitle">
          Sign this with Medi-Kiosk mobile app to log in instantly
        </p>
        <p className="mk-kqr__hint">(Click the code to simulate confirming on your phone)</p>
      </div>
    </KioskShell>
  );
}

function QrPattern() {
  const cells = Array.from({ length: 121 }, (_, i) => i);
  return (
    <svg viewBox="0 0 121 121" className="mk-kqr__svg">
      {cells.map((i) => {
        const x = i % 11;
        const y = Math.floor(i / 11);
        const isFinder = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
        const filled = isFinder ? true : Math.random() > 0.52;
        if (!filled) return null;
        return <rect key={i} x={x * 11} y={y * 11} width="10" height="10" rx="1.5" fill="#14243a" />;
      })}
    </svg>
  );
}
