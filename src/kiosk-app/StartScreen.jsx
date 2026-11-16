import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import AttractLoop from './AttractLoop';
import StaffShutdown from './StaffShutdown';
import { formatDate, formatTime, useNow } from './useNow';
import { setLang, t, useLang } from './i18n';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';

// After this long with no touch on the start screen, the intro video starts.
const ATTRACT_AFTER_MS = 10000;
// Staff only: press and hold the clock this long to open the shutdown panel (asks for the PIN).
const STAFF_HOLD_MS = 5000;

export default function StartScreen() {
  const navigate = useNavigate();
  const now = useNow();
  useLang(); // re-render when a language button is tapped
  const [attract, setAttract] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  const closeAttract = useCallback(() => setAttract(false), []);
  const [staffOpen, setStaffOpen] = useState(false);
  const closeStaff = useCallback(() => setStaffOpen(false), []);
  const holdTimer = useRef(null);
  const startHold = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setStaffOpen(true), STAFF_HOLD_MS);
  };
  const endHold = () => clearTimeout(holdTimer.current);
  useEffect(() => () => clearTimeout(holdTimer.current), []);
  // the intro video means nobody is here: the next person starts in English
  useEffect(() => {
    if (attract) setLang('en');
  }, [attract]);
  const videoFailed = useCallback(() => {
    setVideoBroken(true);
    setAttract(false);
  }, []);

  // Idle timer: any touch restarts it; when it runs out the intro video plays.
  // (Not while the staff panel is open.)
  useEffect(() => {
    if (attract || videoBroken || staffOpen) return undefined;
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
  }, [attract, videoBroken, staffOpen]);

  // Whoever used the kiosk before is always signed out here, and the language is back to English.
  useEffect(() => {
    clearPatientSession();
    setLang('en');
  }, []);

  return (
    <KioskShell>
      <KioskCard variant="start">
        {/* hold 5 s = staff shutdown panel (no visible hint on purpose) */}
        <div
          className="k-start__clock"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          <time dateTime={now.toISOString()}>{formatDate(now)}</time>
          <time dateTime={now.toISOString()}>{formatTime(now)}</time>
        </div>
        <div className="k-start__logo">
          <Logo width={640} />
        </div>
        <button type="button" className="k-start__button" onClick={() => navigate('/kiosk/welcome')}>
          {t('Start')}
        </button>
        <p className="k-start__hint">{t('Touch the button to begin')}</p>
        <Footer />
        {staffOpen && <StaffShutdown onClose={closeStaff} />}
      </KioskCard>
      {attract && <AttractLoop onExit={closeAttract} onFail={videoFailed} />}
    </KioskShell>
  );
}
