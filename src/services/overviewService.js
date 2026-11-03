import { api } from './api';

export const getDashboardStats = () => api('/api/dashboard/stats', { as: 'staff' });
/** Admin and super admin only. */
export const getRecentActivity = () => api('/api/dashboard/recent-activity', { as: 'staff' });
/** Super admin only. */
export const getAuditLogs = (search = '') => api(`/api/audit-logs?search=${encodeURIComponent(search)}`, { as: 'staff' });
