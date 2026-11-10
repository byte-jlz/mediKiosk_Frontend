// ============================================================
// KIOSK SESSION SERVICE (REST)
// ------------------------------------------------------------
// One backend "session" per REGISTERED patient's check-in. The kiosk agent
// files every scan result under this session id (via MQTT -> backend), so
// the readings saved to the patient's record always come from the sensors,
// never from the browser. See backend/app/routers/sessions.py.
//
// GUESTS get no session: their scans are sent with `session: null`, so the
// readings are only shown on the kiosk screen and never reach the clinic
// staff's queue or any patient record.
//
// These responses never contain the risk level - that is staff-only.
// ============================================================
import { request } from './apiClient';

/** POST /api/kiosk-sessions -> { sessionId, readings, missingVitals, ... } */
export function startKioskSession(kioskId, patientId, patientName) {
  return request('POST', '/kiosk-sessions', {
    kioskId,
    patientId,
    patientName: patientName || null,
  });
}

/** GET /api/kiosk-sessions/{id} -> readings so far + official heart rate */
export function getKioskSession(sessionId) {
  return request('GET', `/kiosk-sessions/${sessionId}`);
}

/**
 * POST /api/kiosk-sessions/{id}/complete
 * Saves the check-in to the patient's record and sends it to the staff queue.
 * The backend refuses it unless every reading is there.
 * -> { success, checkInId, incomplete, missingVitals, readings }
 */
export function completeKioskSession(sessionId) {
  return request('POST', `/kiosk-sessions/${sessionId}/complete`, { allowIncomplete: false });
}
