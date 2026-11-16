import { useEffect, useRef } from 'react';
import { formatDate, formatTime, useNow } from './useNow';
import { t } from './i18n';

// The intro video (made from src/attract/Movie.jsx - re-render it with tools/attract/render.py).
// It has no clock or button drawn in: those are live, on top of it.
const VIDEO = '/attract/medikiosk-attract.mp4';
// No picture after this long = the video isn't working on this machine -> close it.
const NO_FRAME_MS = 5000;

/**
 * The "attract loop" shown while nobody is using the kiosk: the team / sensors /
 * how-it-works video on repeat, muted. One touch anywhere closes it - and that
 * touch only closes it, it never presses whatever is underneath.
 *
 * onExit:  someone touched the screen
 * onFail:  the video can't play (missing file, decoder problem) - the start screen
 *          stays as it is and stops trying until the next reload
 */
export default function AttractLoop({ onExit, onFail }) {
  const now = useNow();
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    // (put the file back if a previous clean-up took it away - React runs effects twice in dev mode)
    if (!v.getAttribute('src')) v.src = VIDEO;
    v.muted = true; // Chromium only autoplays muted video
    let closed = false;
    // (a play() cut short by our own clean-up below is not a broken video)
    v.play()?.catch(() => !closed && onFail?.());

    // Watchdog: if no picture has come out after a few seconds (the Pi's video decoder can
    // fail without any error), close the video instead of leaving a blank screen.
    let shown = false;
    const markShown = () => {
      shown = true;
    };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(markShown);
    else v.addEventListener('timeupdate', markShown, { once: true });
    const watchdog = setTimeout(() => {
      if (!shown) {
        // close it for now; it tries again the next time nobody touches the screen
        console.warn('[attract] no video frame after', NO_FRAME_MS, 'ms - closing the intro video');
        onExit();
      }
    }, NO_FRAME_MS);

    return () => {
      closed = true;
      clearTimeout(watchdog);
      v.removeEventListener('timeupdate', markShown);
      // Hand the video decoder back RIGHT AWAY. Otherwise the Pi keeps it busy until the
      // browser cleans up later, and the next screen's video (Start -> Welcome) stays blank.
      v.pause();
      v.removeAttribute('src');
      v.load();
    };
  }, [onFail, onExit]);

  const exit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onExit();
  };

  return (
    <div className="k-attract" role="button" tabIndex={0} aria-label={t('Touch anywhere to start')} onClick={exit}>
      <video
        ref={videoRef}
        className="k-attract__video"
        src={VIDEO}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onError={() => onFail?.()}
      />
      <div className="k-attract__clock">
        <time dateTime={now.toISOString()}>{formatDate(now)}</time>
        <time dateTime={now.toISOString()}>{formatTime(now)}</time>
      </div>
      <div className="k-attract__hint">
        <span>{t('Touch anywhere to start')}</span>
      </div>
    </div>
  );
}
