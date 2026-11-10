import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { IconTile, KioskButton, KioskCard, Spacer, TopBar } from './ui/KioskUI';
import { KIOSK_STEPS } from './wizard/kioskSteps';
import { clearPatientSession, getCurrentPatient } from '../services/authService';
import { shortName } from './patientName';

export default function SignedInScreen() {
  const navigate = useNavigate();
  const patient = getCurrentPatient();

  // Nobody signed in (e.g. the page was reloaded) -> back to the start.
  useEffect(() => {
    if (!patient) navigate('/kiosk', { replace: true });
  }, [patient, navigate]);
  if (!patient) return null;

  function signOut() {
    clearPatientSession();
    navigate('/kiosk');
  }

  return (
    <KioskShell>
      <KioskCard>
        <TopBar name={shortName(patient)} />

        <div className="k-hero k-hero--tight">
          <div className="k-hero__check">
            <span>
              <Icon name="check" size={64} stroke={2.6} />
            </span>
          </div>
          <h1 className="k-h1 k-h1--xl">Hi, {patient.firstName || 'there'}!</h1>
          <p className="k-lead">You’re signed in. Here’s what we’ll measure today.</p>
        </div>

        <ol className="k-readings-list k-readings-list--tight">
          {KIOSK_STEPS.map((s, i) => (
            <li key={s.key} data-color={s.color}>
              <span className="k-readings-list__num">{i + 1}</span>
              <IconTile icon={s.icon} size={80} white />
              <div className="k-readings-list__text">
                <strong>{s.name}</strong>
                <span>{s.measures}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="k-callout k-callout--outlined">
          <Icon name="lock" size={40} />
          <div>
            <strong>All 4 readings are required</strong>
            <p>
              Each reading must be completed before you can move to the next one, so a complete record is saved to your
              account.
            </p>
          </div>
        </div>

        <Spacer />
        <KioskButton icon="arrow" onClick={() => navigate('/kiosk/vitals')}>
          Begin check-in
        </KioskButton>
        <KioskButton variant="secondary" icon="user" onClick={signOut}>
          Sign out
        </KioskButton>
      </KioskCard>
    </KioskShell>
  );
}