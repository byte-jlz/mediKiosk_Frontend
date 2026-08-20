import './PhoneShell.css';

/**
 * Wraps every patient-app screen in a phone-proportioned frame so the
 * whole demo reads clearly as "this is the mobile app" even in a browser.
 */
export default function PhoneShell({ children, dark = false }) {
  return (
    <div className="mk-phone-outer">
      <div className={`mk-phone-shell${dark ? ' mk-phone-shell--dark' : ''}`}>
        {children}
      </div>
    </div>
  );
}
