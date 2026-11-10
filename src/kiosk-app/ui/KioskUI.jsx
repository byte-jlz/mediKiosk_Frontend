// ============================================================
// Shared kiosk building blocks - every screen is made of these.
// Styles: src/kiosk-app/kiosk.css
// ============================================================
import logo from '../../assets/medikiosk-logo.png';
import Icon from './Icon';

export const APP_VERSION = __APP_VERSION__; // from package.json (vite.config.js)
const versionLabel = `Version ${APP_VERSION.split('.').slice(0, 2).join('.')}`;

export function Logo({ width = 210 }) {
  return <img src={logo} alt="MediKiosk" className="k-logo" style={{ width }} />;
}

/**
 * The white card every screen sits on.
 *   variant  'start' | 'welcome' | 'flow' (default)
 *   color    step color ('bmi' | 'breath' | 'bp' | 'temp') for accents inside
 */
export function KioskCard({ variant = 'flow', color, children }) {
  return (
    <div className="k-screen">
      <div className={`k-card k-card--${variant}`} data-color={color}>
        {children}
      </div>
    </div>
  );
}

export function Footer({ children }) {
  return (
    <footer className="k-footer">
      {children ?? (
        <>
          <span className="k-footer__lang">English</span>
          <span className="k-footer__version">{versionLabel}</span>
        </>
      )}
    </footer>
  );
}

/** Logo on the left; who is checking in and Leave on the right. */
export function TopBar({ name, onLeave, onBack }) {
  return (
    <header className="k-topbar">
      {onBack ? (
        <button type="button" className="k-chip k-chip--button" onClick={onBack}>
          <Icon name="back" size={30} />
          Back
        </button>
      ) : (
        <Logo width={200} />
      )}
      <div className="k-topbar__right">
        {name && (
          <span className="k-chip k-chip--name">
            <Icon name="user" size={26} />
            {name}
          </span>
        )}
        {onLeave && (
          <button type="button" className="k-chip k-chip--button k-chip--muted" onClick={onLeave}>
            <Icon name="x" size={26} />
            Leave
          </button>
        )}
        {onBack && <Logo width={186} />}
      </div>
    </header>
  );
}

/**
 * Pill buttons.
 *   variant  'primary' (filled) | 'secondary' (outlined) | 'text'
 *   icon     shown after the label on primary, before it on secondary
 */
export function KioskButton({ variant = 'primary', icon, children, className = '', ...props }) {
  const iconEl = icon ? <Icon name={icon} size={variant === 'primary' ? 40 : 34} stroke={2.4} /> : null;
  return (
    <button type="button" className={`k-btn k-btn--${variant} ${className}`} {...props}>
      {variant !== 'primary' && iconEl}
      <span>{children}</span>
      {variant === 'primary' && iconEl}
    </button>
  );
}

export function Pill({ icon = 'clock', children }) {
  return (
    <div className="k-pill">
      <Icon name={icon} size={26} />
      {children}
    </div>
  );
}

export function Note({ icon = 'lock', className = '', children, ...props }) {
  return (
    <p className={`k-note ${className}`} {...props}>
      <Icon name={icon} size={28} />
      {children}
    </p>
  );
}

export function IconTile({ icon, size = 148, white = false }) {
  return (
    <div className={`k-icontile${white ? ' k-icontile--white' : ''}`} style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.5)} stroke={1.9} />
    </div>
  );
}

export function NumberedList({ items, className = '' }) {
  return (
    <ol className={`k-steps-list ${className}`}>
      {items.map((t, i) => (
        <li key={t}>
          <span className="k-steps-list__num">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function Spacer() {
  return <div className="k-spacer" />;
}

/**
 * "Are you sure?" popup shown over the card (the card is its positioning parent).
 * Warns that leaving wipes the readings taken so far.
 */
export function LeaveDialog({ destination, onStay, onLeave }) {
  return (
    <div className="k-dialog" role="alertdialog" aria-modal="true" aria-labelledby="k-leave-title">
      <div className="k-dialog__box">
        <span className="k-dialog__icon">
          <Icon name="alert" size={64} />
        </span>
        <h2 id="k-leave-title" className="k-dialog__title">
          Leave this check-in?
        </h2>
        <p className="k-dialog__text">
          If you leave now, the readings you’ve taken so far will be lost and the whole process will be wiped out. You’ll
          need to start again from the beginning.
        </p>
        <p className="k-dialog__muted">{destination}</p>
        <KioskButton icon="back" onClick={onStay}>
          Stay and continue
        </KioskButton>
        <KioskButton variant="secondary" icon="x" onClick={onLeave}>
          Leave and lose my readings
        </KioskButton>
      </div>
    </div>
  );
}