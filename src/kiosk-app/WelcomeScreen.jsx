import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';
import { t, useLang } from './i18n';

// Where the "Get the MediKiosk app" QR code points: the Android app (APK) build on Expo.
// After a new app build, put its link in .env as VITE_APP_DOWNLOAD_URL (or change it here).
const APP_DOWNLOAD_URL =
  import.meta.env.VITE_APP_DOWNLOAD_URL ||
  'https://expo.dev/artifacts/eas/4IY_FucWXEtwGTAofht6SWGXb5CCXW4otJKfoQVJKLY.apk';

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const [appQr, setAppQr] = useState('');
  useLang(); // re-render when a language button is tapped

  useEffect(() => {
    if (!APP_DOWNLOAD_URL) return;
    QRCode.toDataURL(APP_DOWNLOAD_URL, { margin: 1, width: 440, color: { dark: '#14243aff' } })
      .then(setAppQr)
      .catch(() => setAppQr(''));
  }, []);

  function continueAsGuest() {
    clearPatientSession();
    navigate('/kiosk/guest');
  }

  return (
    <KioskShell>
      <KioskCard variant="welcome">
        <Logo width={440} />
        <h1 className={`k-welcome__title${t('Welcome').length > 12 ? ' k-welcome__title--long' : ''}`}>{t('Welcome')}</h1>
        <p className="k-welcome__subtitle">
          {t('Check your vital signs here.')}
          <br />
          {t('Choose how you would like to begin.')}
        </p>

        <div className="k-welcome__options">
          <button type="button" className="k-option k-option--primary" onClick={() => navigate('/kiosk/qr-scan')}>
            <Icon name="qr" size={56} stroke={1.8} />
            <span>
              <strong>{t('Login with QR')}</strong>
              <small>{t('Scan the QR code from your app')}</small>
            </span>
          </button>
          <button type="button" className="k-option" onClick={continueAsGuest}>
            <Icon name="user" size={56} stroke={1.8} />
            <span>
              <strong>{t('Continue as Guest')}</strong>
              <small>{t('No account needed')}</small>
            </span>
          </button>
        </div>

        <div className="k-welcome__app">
          <div className="k-welcome__qr">
            {appQr ? (
              <img src={appQr} alt={t('QR code to download the MediKiosk app')} />
            ) : (
              <Icon name="qr" size={120} stroke={1.2} />
            )}
          </div>
          <div>
            <p className="k-welcome__app-title">{t('Get the MediKiosk app to keep track of your health!')}</p>
            <p className="k-welcome__app-text">
              {t(
                'New here? Scan the QR code to download the app and register for an account or ask the clinic staff to register you.'
              )}
            </p>
          </div>
        </div>

        <Footer />
      </KioskCard>
    </KioskShell>
  );
}
