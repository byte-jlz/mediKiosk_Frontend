import { useEffect, useState } from 'react';
import './KioskShell.css';

// The kiosk touchscreen is mounted VERTICALLY (portrait, 1080 x 1920).
// Every kiosk screen is laid out on this fixed canvas, then scaled to fit the
// window - so the Pi's full-screen browser and a dev laptop show the same thing.
export const KIOSK_WIDTH = 1080;
export const KIOSK_HEIGHT = 1920;

function fitScale() {
  return Math.min(window.innerWidth / KIOSK_WIDTH, window.innerHeight / KIOSK_HEIGHT);
}

/**
 * Wraps every kiosk screen in a tall, portrait frame - represents the
 * physical vertical touchscreen, as opposed to the phone (patient-app)
 * or browser window (admin-console).
 *
 * split: art banner on top, content below (landing / sign-in screens).
 */
export default function KioskShell({ children, split = false }) {
  const [scale, setScale] = useState(fitScale);

  useEffect(() => {
    const onResize = () => setScale(fitScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="mk-kiosk-outer">
      <div
        className="mk-kiosk-frame"
        style={{ width: KIOSK_WIDTH * scale, height: KIOSK_HEIGHT * scale }}
      >
        <div
          className={`mk-kiosk-shell${split ? ' mk-kiosk-shell--split' : ''}`}
          style={{ width: KIOSK_WIDTH, height: KIOSK_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
