import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import PhoneShell from './PhoneShell';
import BottomTabs from './BottomTabs';
import { getMyKioskQr } from '../services/authService';
import { toQrPayload } from '../services/patientQr';
import './MyQrScreen.css';
import './BottomTabs.css';

/**
 * "My QR" - the patient's own kiosk sign-in code.
 * Same token + same encoding (MEDIKIOSK:<token>) as the admin console's
 * PatientQrCode, so the code on the phone, the printed code from the admin
 * and the kiosk scanner all match. Opened right after sign-up
 * (state.justCreated) and from the bottom "MY QR" tab.
 */
export default function MyQrScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = Boolean(location.state?.justCreated);

  const [info, setInfo] = useState(null); // { patientId, firstName, ..., qrToken }
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNeedsSignIn(false);
    try {
      const res = await getMyKioskQr();
      setInfo(res);
      const url = await QRCode.toDataURL(toQrPayload(res.qrToken), {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setDataUrl(url);
    } catch (err) {
      setInfo(null);
      setDataUrl('');
      setNeedsSignIn(err.status === 401);
      setError(err.message || 'Could not load your QR code.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fullName = info
    ? [info.firstName, info.middleName, info.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <PhoneShell>
      <div className="mk-myqr">
        <div className="mk-myqr__scroll">
          <h1 className="mk-myqr__title">{justCreated ? 'Account created!' : 'My kiosk QR'}</h1>
          <p className="mk-myqr__subtitle">
            {justCreated
              ? 'Here is your personal QR code. Show it at any Medi-Kiosk to sign in.'
              : 'Show this code to the Medi-Kiosk scanner to sign in instantly.'}
          </p>

          <div className="mk-myqr__card">
            <div className="mk-myqr__code">
              {dataUrl ? (
                <img src={dataUrl} alt={`Kiosk sign-in QR code for ${fullName}`} />
              ) : (
                <span className="mk-myqr__placeholder">{loading ? 'Loading…' : 'No code'}</span>
              )}
            </div>
            {info && (
              <>
                <p className="mk-myqr__name">{fullName}</p>
                <p className="mk-myqr__id">Patient ID · {info.patientId}</p>
              </>
            )}
          </div>

          {error && <p className="mk-myqr__error">{error}</p>}

          <div className="mk-myqr__actions">
            {needsSignIn ? (
              <button className="mk-myqr__primary" onClick={() => navigate('/app/sign-in')}>
                Sign in
              </button>
            ) : error ? (
              <button className="mk-myqr__primary" onClick={load}>
                Try again
              </button>
            ) : (
              dataUrl && (
                <a
                  className="mk-myqr__secondary"
                  href={dataUrl}
                  download={`${info.patientId}-kiosk-qr.png`}
                >
                  ⬇ Save to phone
                </a>
              )
            )}
            {justCreated && !error && (
              <button className="mk-myqr__primary" onClick={() => navigate('/app/vitals-home')}>
                Continue
              </button>
            )}
          </div>

          <p className="mk-myqr__note">
            Keep this code private, it signs in as you. If you lose it or someone else has it,
            ask the clinic staff for a new one. The old code will stop working.
          </p>
        </div>

        <BottomTabs />
      </div>
    </PhoneShell>
  );
}
