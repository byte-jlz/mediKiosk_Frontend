import { useCallback, useEffect, useState } from 'react';
import AttractLoop from './AttractLoop';
import { setLang } from './i18n';

// If the intro video can't play (missing file, decoder problem), stop trying on EVERY
// screen until the page is reloaded - shared by the Start and Welcome screens.
let videoBroken = false;

/**
 * Plays the intro video (AttractLoop) after `afterMs` with no touch on the screen.
 * Any touch restarts the countdown; one touch on the video closes it and leaves the
 * screen as it was.
 *
 *   afterMs  how long nobody touches the screen before the video starts
 *   paused   true while something must not be covered (e.g. the staff PIN panel)
 *
 * Used on the two landing screens: Start (10 s) and Welcome (20 s).
 */
export default function IdleAttract({ afterMs, paused = false }) {
  const [attract, setAttract] = useState(false);
  const [broken, setBroken] = useState(videoBroken);

  const close = useCallback(() => setAttract(false), []);
  const failed = useCallback(() => {
    videoBroken = true;
    setBroken(true);
    setAttract(false);
  }, []);

  // the intro video means nobody is here: the next person starts in English
  useEffect(() => {
    if (attract) setLang('en');
  }, [attract]);

  // Idle timer: any touch restarts it; when it runs out the intro video plays.
  useEffect(() => {
    if (attract || broken || paused) return undefined;
    let timer;
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setAttract(true), afterMs);
    };
    restart();
    window.addEventListener('pointerdown', restart);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', restart);
    };
  }, [attract, broken, paused, afterMs]);

  return attract ? <AttractLoop onExit={close} onFail={failed} /> : null;
}
