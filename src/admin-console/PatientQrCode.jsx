import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Button from '../components/Button';
import { toQrPayload } from '../services/patientQr';

/**
 * Renders a patient's kiosk-login QR code plus Download / Print actions.
 * `compact` shrinks the action buttons to fit under a small code (e.g. in the page header).
 */
export default function PatientQrCode({ patient, size = 220, compact = false }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(toQrPayload(patient.qrToken), { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => !cancelled && setDataUrl(''));
    return () => {
      cancelled = true;
    };
  }, [patient.qrToken]);

  const fullName = [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');

  function handlePrint() {
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(fullName)} – Kiosk QR</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; color: #14243a; }
        img { width: 300px; height: 300px; }
        h1 { font-size: 20px; margin: 16px 0 4px; }
        p { margin: 4px 0; font-size: 13px; color: #555; }
      </style></head><body>
      <p><strong>Medi-Kiosk</strong></p>
      <img src="${dataUrl}" alt="Kiosk login QR code" />
      <h1>${escapeHtml(fullName)}</h1>
      <p>${escapeHtml(patient.id)}</p>
      <p>Scan this code at any Medi-Kiosk to sign in. Keep it private.</p>
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className={`mk-patient-qr${compact ? ' is-compact' : ''}`}>
      <div className="mk-patient-qr__image" style={{ width: size, height: size }}>
        {dataUrl ? <img src={dataUrl} alt={`Kiosk login QR code for ${fullName}`} /> : <span>Generating…</span>}
      </div>
      <div className="mk-patient-qr__actions">
        <a
          className={`mk-btn mk-btn--secondary${dataUrl ? '' : ' is-disabled'}`}
          href={dataUrl || undefined}
          download={`${patient.id}-kiosk-qr.png`}
        >
          {compact ? '⬇ PNG' : '⬇ Download'}
        </a>
        <Button variant="secondary" onClick={handlePrint} disabled={!dataUrl}>
          🖨 Print
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
