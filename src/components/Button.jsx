import './Button.css';

/**
 * Shared button, matches the pill-shaped buttons across every Figma screen.
 *
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
 * accentColor: optional hex, used for per-vital colored buttons in the wizard
 */
export default function Button({
  children,
  variant = 'primary',
  accentColor,
  fullWidth = false,
  icon,
  disabled = false,
  type = 'button',
  onClick,
}) {
  const style = accentColor
    ? { '--btn-accent': accentColor }
    : undefined;

  return (
    <button
      type={type}
      className={`mk-btn mk-btn--${variant}${fullWidth ? ' mk-btn--full' : ''}`}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {icon && <span className="mk-btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
