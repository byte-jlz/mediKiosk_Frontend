import './StatusBadge.css';

const tier = (name) => ({ dot: `var(--tier-${name})`, bg: `var(--tier-${name}-bg)`, text: `var(--tier-${name}-ink)` });
const STATUS_COLORS = {
  // urgency tiers: High red, Medium yellow, Low blue, Normal green
  High: tier('high'),
  Medium: tier('medium'),
  Low: tier('low'),
  Normal: tier('normal'),
  // kiosk and account states
  Online: tier('normal'),
  Idle: tier('medium'),
  Maintenance: { dot: '#6b7f86', bg: '#e8eef0', text: '#44585f' },
  Offline: { dot: '#8fa3aa', bg: '#eef3f4', text: '#5f7780' },
  Suspended: tier('high'),
  Deactivated: { dot: '#8fa3aa', bg: '#eef3f4', text: '#5f7780' },
  // audit severity
  Info: tier('low'),
  Warning: tier('medium'),
  Critical: tier('high'),
};

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Offline;
  return (
    <span
      className="mk-status-badge"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="mk-status-badge__dot" style={{ background: colors.dot }} />
      {status}
    </span>
  );
}
