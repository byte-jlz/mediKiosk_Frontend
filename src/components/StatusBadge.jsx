import './StatusBadge.css';

const STATUS_COLORS = {
  Online: { dot: '#2f9e5c', bg: '#e3f5ea', text: '#1f6b3f' },
  Idle: { dot: '#d99a2b', bg: '#fdf1d6', text: '#8a611a' },
  Maintenance: { dot: '#6b7280', bg: '#e9ebee', text: '#4b5563' },
  Suspended: { dot: '#e0574a', bg: '#fbdcdc', text: '#a3352a' },
  Deactivated: { dot: '#9aa3af', bg: '#eef0f2', text: '#6b7280' },
  Low: { dot: '#d97706', bg: '#fff4e5', text: '#92400e' },
  Normal: { dot: '#2f9e5c', bg: '#e3f5ea', text: '#1f6b3f' },
  Moderate: { dot: '#d99a2b', bg: '#fdf1d6', text: '#8a611a' },
  High: { dot: '#e1574a', bg: '#fdecea', text: '#a3352a' },
};

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.Idle;
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
