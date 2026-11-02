// Shared labels for the Super Admin kiosk screens.

const CONNECTION = {
  online: 'Online',
  busy: 'Busy (scanning)',
  offline: 'Offline',
  never: 'Never connected',
};

/** never | online | busy | offline -> text */
export const connectionLabel = (c) => CONNECTION[c] || c || '—';

/** StatusBadge key for a connection state */
export const connectionBadge = (c) =>
  ({ online: 'Online', busy: 'Busy', offline: 'Offline', never: 'Never connected' })[c] || 'Offline';

/** epoch seconds -> "just now" / "4 min ago" / "2 h ago" / date */
export function fmtAgo(epochSec, now = Date.now()) {
  if (!epochSec) return '—';
  const s = Math.max(0, Math.round(now / 1000 - epochSec));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(epochSec * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function fmtDateTimeSec(epochSec) {
  if (!epochSec) return '—';
  return new Date(epochSec * 1000).toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
