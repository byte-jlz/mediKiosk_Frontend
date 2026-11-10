import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** The current time, refreshed right when the minute changes. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const msToNextMinute = () => {
      const d = new Date();
      return 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50;
    };
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, msToNextMinute());
    };
    timer = setTimeout(tick, msToNextMinute());
    return () => clearTimeout(timer);
  }, []);
  return now;
}

export default function StartScreen() {
  const navigate = useNavigate();
  const now = useNow();

  // Whoever used the kiosk before is always signed out here.
  useEffect(() => {
    clearPatientSession();
  }, []);

  return (
    <KioskShell>
      <KioskCard variant="start">
        <div className="k-start__clock">
          <time dateTime={now.toISOString()}>{dateFormat.format(now)}</time>
          <time dateTime={now.toISOString()}>{timeFormat.format(now)}</time>
        </div>
        <div className="k-start__logo">
          <Logo width={640} />
        </div>
        <button type="button" className="k-start__button" onClick={() => navigate('/kiosk/welcome')}>
          Start
        </button>
        <p className="k-start__hint">Touch the button to begin</p>
        <Footer />
      </KioskCard>
    </KioskShell>
  );
}
