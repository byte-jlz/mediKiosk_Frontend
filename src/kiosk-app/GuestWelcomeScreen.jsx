import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { IconTile, KioskButton, KioskCard, Spacer, TopBar } from './ui/KioskUI';
import { KIOSK_STEPS } from './wizard/kioskSteps';
import { t, useLang } from './i18n';

export default function GuestWelcomeScreen() {
  const navigate = useNavigate();
  useLang();

  return (
    <KioskShell>
      <KioskCard>
        <TopBar name={t('Guest')} onBack={() => navigate('/kiosk/welcome')} />

        <div className="k-hero k-hero--compact">
          <div className="k-hero__avatar">
            <Icon name="user" size={60} stroke={1.9} />
          </div>
          <h1 className="k-h1">{t('Welcome, Guest!')}</h1>
          <p className="k-lead">{t('Check your vital signs — no account needed.')}</p>
        </div>

        <ul className="k-readings-list k-readings-list--compact">
          {KIOSK_STEPS.map((s) => (
            <li key={s.key} data-color={s.color}>
              <IconTile icon={s.icon} size={64} white />
              <div className="k-readings-list__text">
                <strong>{t(s.name)}</strong>
                <span>{t(s.measures)}</span>
              </div>
              <em className="k-tag">{t('Optional')}</em>
            </li>
          ))}
        </ul>

        <div className="k-callout k-callout--warn k-callout--compact">
          <Icon name="cloudOff" size={38} />
          <div>
            <strong>{t('Your readings won’t be sent to the clinic staff')}</strong>
            <p>
              {t('You’ll see them on screen, but they aren’t saved or shared. Sign in to send your readings to the staff.')}
            </p>
          </div>
        </div>

        <Spacer />
        <KioskButton icon="arrow" onClick={() => navigate('/kiosk/vitals')}>
          {t('Start as guest')}
        </KioskButton>
        <KioskButton variant="secondary" icon="qr" onClick={() => navigate('/kiosk/qr-scan')}>
          {t('Sign in with QR instead')}
        </KioskButton>
      </KioskCard>
    </KioskShell>
  );
}