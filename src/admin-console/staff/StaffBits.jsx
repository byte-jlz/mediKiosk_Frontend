import { urgencyLabel } from './triageFormat';
import './staff.css';

/** High Risk / Medium Risk / Not rated / Normal - text + color, never color alone. */
export function UrgencyBadge({ level, size }) {
  const key = level || 'unrated';
  return (
    <span className={`mk-urg mk-urg--${key}${size === 'lg' ? ' mk-urg--lg' : ''}`}>
      <span className="mk-urg__dot" aria-hidden="true" />
      {urgencyLabel(level)}
    </span>
  );
}

const LIVE_TEXT = {
  live: 'Live',
  connecting: 'Connecting…',
  offline: 'Offline – refreshing every 15 s',
};

/** Shows whether the dashboard is receiving live updates. */
export function LiveIndicator({ live }) {
  return (
    <span className={`mk-live mk-live--${live}`} role="status">
      <span className="mk-live__dot" aria-hidden="true" />
      {LIVE_TEXT[live] || live}
    </span>
  );
}
