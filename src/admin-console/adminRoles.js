// ============================================================
// ADMIN CONSOLE ROLES
// ------------------------------------------------------------
// One /admin website, a different menu per role - straight from the
// use-case diagrams (Figure 3.4 Clinic Staff, Figure 3.5 Super Admin).
// The backend enforces the same rules (backend/app/security.py); this file
// only decides what the menu shows and which pages a role may open.
// ============================================================

export const SUPER_ADMIN = 'super_admin';
export const CLINIC_STAFF = 'clinic_staff';

export const ROLE_LABELS = {
  [SUPER_ADMIN]: 'Super Admin',
  [CLINIC_STAFF]: 'Clinic Staff',
};

// Clinic Staff: View prioritized patient queue (+ filtered by urgency),
// View patient vital signs details (+ results/history), Receive priority
// alerts (the bell in the header), Monitor real-time dashboard,
// Patient records (every check-in the clinic handled - shared by all staff).
const CLINIC_STAFF_MENU = [
  { to: '/admin/live', label: 'Live dashboard', icon: '◉', end: true },
  { to: '/admin/queue', label: 'Patient queue', icon: '☰' },
  { to: '/admin/records', label: 'Patient records', icon: '🗂' },
];

// Super Admin: Manage clinic staff accounts, Manage patient records
// (+ view history), Manage kiosk, Monitor kiosk activity, Generate reports
// (+ export), View system logs / audit trail.
const SUPER_ADMIN_MENU = [
  { to: '/admin/dashboard', label: 'Overview', icon: '▦', end: true },
  { to: '/admin/staff', label: 'Staff accounts', icon: '👥' },
  { to: '/admin/patients', label: 'Patient records', icon: '📄' },
  { to: '/admin/kiosks', label: 'Kiosks', icon: '🖥' },
  { to: '/admin/kiosks-activity', label: 'Kiosk activity', icon: '📈' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
  { to: '/admin/audit-logs', label: 'Audit trail', icon: '📋' },
];

export function menuFor(role) {
  if (role === SUPER_ADMIN) return SUPER_ADMIN_MENU;
  if (role === CLINIC_STAFF) return CLINIC_STAFF_MENU;
  return [];
}

/** The first page a role lands on after signing in. */
export function homeFor(role) {
  return menuFor(role)[0]?.to || '/admin';
}
