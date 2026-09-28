// ============================================================
// KIOSKS SERVICE
// ------------------------------------------------------------
// Powers the admin console's "Kiosks" and dashboard "Kiosks
// Health" screens. Swap the bodies below for real fetch() calls.
// ============================================================

import { mockKiosks } from '../mocks/mockKiosks';
import { getDashboardStats as getAdminDashboardStats } from './adminStore';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let kioskData = [...mockKiosks];

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/kiosks
 * RESPONSE: [{ id, name, clinic, status, uptime, today, firmware }, ...]
 */
export async function getKiosks() {
  await delay(400);
  return kioskData.filter((k) => !k.removedAt);
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/kiosks?removed=true
 * RESPONSE: [{ id, name, clinic, status, uptime, today, firmware, removedAt }, ...]
 */
export async function getRemovedKiosks() {
  await delay(400);
  return kioskData
    .filter((k) => k.removedAt)
    .sort((a, b) => new Date(b.removedAt) - new Date(a.removedAt));
}

/**
 * EXPECTED BACKEND ENDPOINT: DELETE /api/kiosks/{id}
 * Soft delete: the kiosk moves to the "Removed" tab and can be restored.
 */
export async function removeKiosk(id) {
  await delay(300);
  kioskData = kioskData.map((k) =>
    k.id === id ? { ...k, removedAt: new Date().toISOString() } : k
  );
  return kioskData.find((k) => k.id === id);
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/kiosks/{id}/restore
 */
export async function restoreKiosk(id) {
  await delay(300);
  kioskData = kioskData.map((k) => {
    if (k.id !== id) return k;
    const { removedAt: _removedAt, ...rest } = k;
    return rest;
  });
  return kioskData.find((k) => k.id === id);
}

/**
 * EXPECTED BACKEND ENDPOINT: PATCH /api/kiosks/{id}
 * REQUEST BODY: { status: 'Online' | 'Idle' | 'Maintenance' | 'Deactivated' }
 */
export async function setKioskStatus(id, status) {
  await delay(300);
  kioskData = kioskData.map((k) => (k.id === id ? { ...k, status } : k));
  return kioskData.find((k) => k.id === id);
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/kiosks
 * REQUEST BODY: { name, clinic }
 * RESPONSE: the created kiosk record
 */
export async function addKiosk(kiosk) {
  await delay(400);
  const newKiosk = {
    id: `K-0${kioskData.length + 1}`,
    status: 'Online',
    uptime: '100%',
    today: 0,
    firmware: '2.4.1',
    ...kiosk,
  };
  kioskData = [...kioskData, newKiosk];
  return newKiosk;
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/dashboard/stats
 * RESPONSE: { clinicalStaff, patientRecords, kiosksOnline, kiosksTotal, checkInsToday, ... }
 */
export async function getDashboardStats() {
  await delay(400);

  // Computed from the same live list the Kiosks tab edits, so removed or
  // newly added kiosks are reflected in the overview immediately.
  const activeKiosks = kioskData.filter((k) => !k.removedAt);
  const clinicCount = new Set(activeKiosks.map((k) => k.clinic)).size;

  return {
    ...getAdminDashboardStats(),
    kiosksOnline: activeKiosks.filter((k) => k.status === 'Online').length,
    kiosksTotal: activeKiosks.length,
    kiosksAcross:
      activeKiosks.length === 0
        ? 'No active kiosks'
        : `Across ${clinicCount} clinic${clinicCount === 1 ? '' : 's'}`,
  };
}
