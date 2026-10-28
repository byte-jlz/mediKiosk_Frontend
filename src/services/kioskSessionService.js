// ============================================================
// KIOSK SESSION SERVICE (REST)
// ------------------------------------------------------------
// One backend "session" per check-in at the kiosk. The kiosk agent files
// every scan result under this session id (via MQTT -> backend), so the
// readings saved for the patient always come from the sensors, never from
// the browser. See backend/app/routers/sessions.py.
//
// These responses never contain the risk level - that is staff-only.
// ============================================================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(method, path, body) {
  const options = { method };
  if (body) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE_URL}/api${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

/** POST /api/kiosk-sessions -> { sessionId, readings, missingVitals, ... } */
export function startKioskSession(kioskId, patientId) {
  return request('POST', '/kiosk-sessions', { kioskId, patientId: patientId || null });
}

/** GET /api/kiosk-sessions/{id} -> readings so far + official heart rate */
export function getKioskSession(sessionId) {
  return request('GET', `/kiosk-sessions/${sessionId}`);
}

/**
 * POST /api/kiosk-sessions/{id}/complete
 * allowIncomplete: true = "Finish without it" (saved as incomplete, flagged for staff)
 * -> { success, checkInId, incomplete, missingVitals, readings }
 */
export function completeKioskSession(sessionId, allowIncomplete = false) {
  return request('POST', `/kiosk-sessions/${sessionId}/complete`, { allowIncomplete });
}
