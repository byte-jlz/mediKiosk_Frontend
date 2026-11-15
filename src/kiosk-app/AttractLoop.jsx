import { useEffect, useRef } from 'react';
import { dateFormat, timeFormat, useNow } from './useNow';

// The intro video (made from src/attract/Movie.jsx - re-render it with tools/attract/render.py).
// It has no clock or button drawn in: those are live, on top of it.
const VIDEO = '/attract/medikiosk-attract.mp4';

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
    if (!v) return;
    v.muted = true; // Chromium only autoplays muted video
    v.play()?.catch(() => onFail?.());
  }, [onFail]);

  const exit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onExit();
  };

  return (
    <div className="k-attract" role="button" tabIndex={0} aria-label="Touch anywhere to start" onClick={exit}>
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
        <time dateTime={now.toISOString()}>{dateFormat.format(now)}</time>
        <time dateTime={now.toISOString()}>{timeFormat.format(now)}</time>
      </div>
      <div className="k-attract__hint">
        <span>Touch anywhere to start</span>
      </div>
    </div>
  );
}
