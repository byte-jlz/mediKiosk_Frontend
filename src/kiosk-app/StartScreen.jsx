import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import AttractLoop from './AttractLoop';
import { formatDate, formatTime, useNow } from './useNow';
import { setLang, t, useLang } from './i18n';
import { Footer, KioskCard, Logo } from './ui/KioskUI';
import { clearPatientSession } from '../services/authService';

// After this long with no touch on the start screen, the intro video starts.
const ATTRACT_AFTER_MS = 10000;

export default function StartScreen() {
  const navigate = useNavigate();
  const now = useNow();
  useLang(); // re-render when a language button is tapped
  const [attract, setAttract] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  const closeAttract = useCallback(() => setAttract(false), []);
  // the intro video means nobody is here: the next person starts in English
  useEffect(() => {
    if (attract) setLang('en');
  }, [attract]);
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

  // Whoever used the kiosk before is always signed out here, and the language is back to English.
  useEffect(() => {
    clearPatientSession();
    setLang('en');
  }, []);

  return (
    <KioskShell>
      <KioskCard variant="start">
        <div className="k-start__clock">
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
      </KioskCard>
      {attract && <AttractLoop onExit={closeAttract} onFail={videoFailed} />}
    </KioskShell>
  );
}
