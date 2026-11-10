import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { IconTile, KioskButton, KioskCard, Spacer, TopBar } from './ui/KioskUI';
import { KIOSK_STEPS } from './wizard/kioskSteps';

export default function GuestWelcomeScreen() {
  const navigate = useNavigate();

  return (
    <KioskShell>
      <KioskCard>
        <TopBar name="Guest" onBack={() => navigate('/kiosk/welcome')} />

        <div className="k-hero k-hero--compact">
          <div className="k-hero__avatar">
            <Icon name="user" size={60} stroke={1.9} />
          </div>
          <h1 className="k-h1">Welcome, Guest!</h1>
          <p className="k-lead">Check your vital signs — no account needed.</p>
        </div>

        <ul className="k-readings-list k-readings-list--compact">
          {KIOSK_STEPS.map((s) => (
            <li key={s.key} data-color={s.color}>
              <IconTile icon={s.icon} size={64} white />
              <div className="k-readings-list__text">
                <strong>{s.name}</strong>
                <span>{s.measures}</span>
              </div>
              <em className="k-tag">Optional</em>
            </li>
          ))}
        </ul>

        <div className="k-callout k-callout--compact">
          <Icon name="skip" size={38} />
          <div>
            <strong>Every reading can be skipped</strong>
            <p>Tap “Skip this reading” on any step you don’t want to take.</p>
          </div>
        </div>
        <div className="k-callout k-callout--warn k-callout--compact">
          <Icon name="cloudOff" size={38} />
          <div>
            <strong>Your readings won’t be sent to the clinic staff</strong>
            <p>You’ll see them on screen, but they aren’t saved or shared. Sign in to send your readings to the staff.</p>
          </div>
        </div>

        <Spacer />
        <KioskButton icon="arrow" onClick={() => navigate('/kiosk/vitals')}>
          Start as guest
        </KioskButton>
        <KioskButton variant="secondary" icon="qr" onClick={() => navigate('/kiosk/qr-scan')}>
          Sign in with QR instead
        </KioskButton>
      </KioskCard>
    </KioskShell>
  );
}