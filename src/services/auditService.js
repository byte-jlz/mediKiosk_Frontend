// ============================================================
// AUDIT SERVICE
// ------------------------------------------------------------
// Powers the admin console's "Audit Logs," "Kiosks Activity,"
// and dashboard "Recent Activity" panel.
// Swap the bodies below for real fetch() calls to FastAPI.
// ============================================================

import { getAuditLogs as getAdminAuditLogs, getRecentActivity as getAdminRecentActivity, getKioskActivity as getAdminKioskActivity } from './adminStore';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/audit-logs?search=...
 * RESPONSE: [{ timestamp, role, actor, target, ip, severity }, ...]
 * This should be an append-only, immutable log on the backend.
 */
export async function getAuditLogs(searchTerm = '') {
  await delay(400);
  return getAdminAuditLogs(searchTerm);
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/dashboard/recent-activity
 * RESPONSE: [{ label, meta, status }, ...]  (most recent first)
 */
export async function getRecentActivity() {
  await delay(300);
  return getAdminRecentActivity();
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/kiosks/activity
 * RESPONSE: [{ time, kiosk, event, patient }, ...]
 * Ideally this would be a live feed (WebSocket / polling) so the
 * "Kiosks Activity" screen updates in real time.
 */
export async function getKioskActivity() {
  await delay(400);
  return getAdminKioskActivity();
}
