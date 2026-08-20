// Mock audit logs — mirrors the "Audit logs" table and "Recent Activity" dashboard panel in Figma.
// Replace with a real fetch to GET /api/audit-logs once the backend is live.

export const mockAuditLogs = [
  {
    timestamp: '2026-05-06 09:42:11',
    role: 'superadmin@clinic.io',
    actor: 'LOGIN',
    target: '—',
    ip: '10.0.4.21',
    severity: 'Online',
  },
  {
    timestamp: '2026-05-06 09:38:02',
    role: 'superadmin@clinic.io',
    actor: 'STAFF CREATE',
    target: 'S-1029 Liam O\'Connor',
    ip: '10.0.4.21',
    severity: 'Online',
  },
  {
    timestamp: '2026-05-05 17:12:44',
    role: 'amelia.chen@clinic.io',
    actor: 'PATIENT VIEW',
    target: 'P-88401 Eleanor Whitefield',
    ip: '10.0.4.33',
    severity: 'Online',
  },
  {
    timestamp: '2026-05-05 15:03:19',
    role: 'superadmin@clinic.io',
    actor: 'KIOSK DEACTIVATE',
    target: 'K-04 Lab Wing — Bayview',
    ip: '10.0.4.21',
    severity: 'Online',
  },
  {
    timestamp: '2026-05-04 08:55:07',
    role: 'henrik.o@clinic.io',
    actor: 'LOGIN FAILED',
    target: '—',
    ip: '10.0.9.12',
    severity: 'Online',
  },
  {
    timestamp: '2026-05-03 11:20:51',
    role: 'superadmin@clinic.io',
    actor: 'STAFF SUSPEND',
    target: 'S-1027 Dr. Henrick Olsen',
    ip: '10.0.4.21',
    severity: 'Online',
  },
];

export const mockRecentActivity = mockAuditLogs.slice(0, 4).map((log) => ({
  label: log.target !== '—' ? `${log.actor} — ${log.target}` : log.actor,
  meta: `${log.timestamp} · ${log.role} · ${log.ip}`,
  status: log.severity,
}));

// Mock kiosk activity feed — for the "Kiosks Activity" nav item
export const mockKioskActivity = [
  { time: '09:42:11', kiosk: 'K-01 · Lobby — North Gate', event: 'Check-in completed', patient: 'P-88401' },
  { time: '09:31:05', kiosk: 'K-02 · Reception — Northgate', event: 'Vitals scan started', patient: 'P-88402' },
  { time: '09:15:42', kiosk: 'K-05 · Entrance — Eastside', event: 'Check-in completed', patient: 'P-88403' },
  { time: '08:58:20', kiosk: 'K-03 · Pharmacy — Bayview', event: 'Idle timeout', patient: '—' },
  { time: '08:40:11', kiosk: 'K-04 · Lab Wing — Bayview', event: 'Entered maintenance mode', patient: '—' },
];
