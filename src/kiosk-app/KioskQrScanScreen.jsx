import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import Button from '../components/Button';
import { patientLoginWithQr } from '../services/authService';
import './KioskQrScreens.css';

export default function KioskQrScanScreen() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    await patientLoginWithQr('demo-qr-token');
    navigate('/kiosk/vitals');
  }

  return (
    <KioskShell>
      <div className="mk-kqr mk-kqr--dark">
        <button className="mk-kqr__back" onClick={() => navigate('/kiosk')} aria-label="Go back">
          ←
        </button>

        <div className={`mk-kqr__camera${scanning ? ' is-scanning' : ''}`}>
          {scanning && <span className="mk-kqr__camera-pulse" />}
        </div>

        <Button variant="secondary" onClick={handleScan} disabled={scanning}>
          {scanning ? 'SCANNING…' : 'SCAN QR CODE'}
        </Button>

        <p className="mk-kqr__hint">Hold your patient QR code up to the camera</p>
      </div>
    </KioskShell>
  );
}
