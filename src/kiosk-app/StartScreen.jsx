import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import AttractLoop from './AttractLoop';
import { dateFormat, timeFormat, useNow } from './useNow';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';

// After this long with no touch on the start screen, the intro video starts.
const ATTRACT_AFTER_MS = 30000;

export default function StartScreen() {
  const navigate = useNavigate();
  const now = useNow();
  const [attract, setAttract] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  const closeAttract = useCallback(() => setAttract(false), []);
  const videoFailed = useCallback(() => {
    setVideoBroken(true);
    setAttract(false);
  }, []);

  // Idle timer: any touch restarts it; when it runs out the intro video plays.
  useEffect(() => {
    if (attract || videoBroken) return undefined;
    let timer;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setAttract(true), ATTRACT_AFTER_MS);
    };
    restart();
    window.addEventListener('pointerdown', restart);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', restart);
    };
  }, [attract, videoBroken]);

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
      {attract && <AttractLoop onExit={closeAttract} onFail={videoFailed} />}
    </KioskShell>
  );
}
