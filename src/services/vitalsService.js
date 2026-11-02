// ============================================================
// VITALS SERVICE
// ------------------------------------------------------------
// Readings are no longer taken here. The kiosk check-in talks to the kiosk
// agent over MQTT (services/kioskAgentService.js) and the backend saves the
// check-in from the agent's own readings (services/kioskSessionService.js).
//
// What's left:
//   getVitalsHistory()          the patient app's history list
//   mirrorCheckInToAdminStore() keeps the admin console's local demo store in
//                               sync until it reads check-ins from the backend
//                               (step 4b)
// ============================================================
import { saveCheckIn, getPatientById } from './adminStore';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Copies a finished kiosk check-in (the readings the BACKEND saved) into the
 * admin console's local store, so its screens keep working for now.
 */
export function mirrorCheckInToAdminStore(patient, readings, kiosk) {
  return saveCheckIn({
    kioskId: kiosk.id,
    kioskName: kiosk.name,
    patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
    readings,
  });
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/vitals/history?patientId=...
 * RESPONSE: [{ kioskName, date, vital, status }, ...]
 * Used by the patient app's "Recent History" list.
 * TODO(step 4b): read the patient's real check-ins from the backend.
 */
export async function getVitalsHistory(patientId) {
  await delay(400);
  try {
    const patient = getPatientById(patientId);
    return patient?.visitHistory || [];
  } catch {
    return [];
  }
}
