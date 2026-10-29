// ============================================================
// AUDIT SERVICE  (Super Admin: "View system logs / audit trail")
// Backend: backend/app/routers/audit.py - Super Admin only.
// Entry: { timestamp, actor (who), action (what), target (which record), ip, severity }
// ============================================================
import { request } from './apiClient';

export const getAuditLogs = (search = '') =>
  request('GET', `/audit-logs${search ? `?search=${encodeURIComponent(search)}` : ''}`);
