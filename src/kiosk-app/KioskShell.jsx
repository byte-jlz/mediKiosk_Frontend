import './KioskShell.css';

/**
 * Wraps every kiosk screen in a wide, landscape frame — represents the
 * physical Surface Pro kiosk hardware, as opposed to the phone (patient-app)
 * or browser window (admin-console).
 */
export default function KioskShell({ children, split = false }) {
  return (
    <div className="mk-kiosk-outer">
      <div className={`mk-kiosk-shell${split ? ' mk-kiosk-shell--split' : ''}`}>
        {children}
      </div>
    </div>
  );
}
