import { useEffect, useRef, useState } from 'react';
import StaffShutdown from './StaffShutdown';
import { formatDate, formatTime, useNow } from './useNow';

// Staff only: press and hold the clock this long to open the staff PIN pad (shutdown or developer options).
const STAFF_HOLD_MS = 5000;

/**
 * The date + time row at the top of the Start and Welcome screens.
 * Hold it 5 s = the hidden staff PIN pad (StaffShutdown.jsx) - no visible hint on purpose.
 *
 *   onOpenChange(open)  told when the staff panel opens / closes (the screen pauses its intro video timer)
 */
export default function StaffClock({ onOpenChange }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const holdTimer = useRef(null);

  const startHold = () => {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setOpen(true), STAFF_HOLD_MS);
  };
  const endHold = () => clearTimeout(holdTimer.current);
  useEffect(() => () => clearTimeout(holdTimer.current), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  return (
    <>
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
      {/* a sibling, not inside the clock: typing the PIN must not start another 5 s hold */}
      {open && <StaffShutdown onClose={() => setOpen(false)} />}
    </>
  );
}
