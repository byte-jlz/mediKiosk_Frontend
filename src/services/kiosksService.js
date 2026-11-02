// ============================================================
// KIOSKS SERVICE  (Super Admin: "Manage kiosk" + "Monitor kiosk activity")
// Backend: backend/app/routers/kiosks.py and dashboard.py - Super Admin only.
// ============================================================
import { request } from './apiClient';

const id = (x) => encodeURIComponent(x);

/** GET /api/kiosks -> [{ id, name, clinic, notes, status, connection, lastSeen, checkInsToday, ... }] */
export const getKiosks = () => request('GET', '/kiosks');

/** POST /api/kiosks { name, clinic, notes } */
export const addKiosk = (kiosk) => request('POST', '/kiosks', kiosk);

/** PATCH /api/kiosks/{id} { name?, clinic?, notes? } - "edit kiosk settings" */
export const updateKiosk = (kioskId, changes) => request('PATCH', `/kiosks/${id(kioskId)}`, changes);

/** A deactivated kiosk can't start new check-ins. */
export const deactivateKiosk = (kioskId) => request('POST', `/kiosks/${id(kioskId)}/deactivate`);
export const activateKiosk = (kioskId) => request('POST', `/kiosks/${id(kioskId)}/activate`);

/** GET /api/kiosks/monitor -> { broker: {connected}, kiosks: [...], activity: [...] } */
export const getKioskMonitor = () => request('GET', '/kiosks/monitor');

/** GET /api/dashboard/stats -> real counts + kiosks + recent audit events */
export const getDashboardStats = () => request('GET', '/dashboard/stats');
