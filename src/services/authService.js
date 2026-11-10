// ============================================================
// AUTH SERVICE (kiosk)
// ------------------------------------------------------------
// The kiosk only signs PATIENTS in, by scanning the QR code from the
// MediKiosk phone app. The signed-in patient is kept for ONE check-in
// and must be cleared when it ends (finish, cancel, back to Start),
// otherwise the next person at the kiosk would see the previous patient.
//
// The patient is kept in sessionStorage (not localStorage) so a kiosk
// reboot or browser restart always starts signed out.
// ============================================================

import { request } from './apiClient';
import { parseQrPayload } from './patientQr';

const PATIENT_KEY = 'mkKioskPatient';
const TOKEN_KEY = 'mkKioskPatientToken';

function store() {
  try {
    return window.sessionStorage;
  } catch {
    return null; // storage blocked - the patient just isn't remembered across a refresh
  }
}

export function savePatientSession(patient, token = '') {
  const s = store();
  if (!s) return;
  s.setItem(PATIENT_KEY, JSON.stringify(patient));
  if (token) s.setItem(TOKEN_KEY, token);
  else s.removeItem(TOKEN_KEY);
}

/** The patient signed in at the kiosk right now, or null for a guest. */
export function getCurrentPatient() {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PATIENT_KEY);
    const patient = raw ? JSON.parse(raw) : null;
    return patient?.id ? patient : null;
  } catch {
    return null;
  }
}

/** Signs the patient out of the kiosk. Call at Start, on cancel and on finish. */
export function clearPatientSession() {
  const s = store();
  if (!s) return;
  s.removeItem(PATIENT_KEY);
  s.removeItem(TOKEN_KEY);
  // Older builds kept the patient in localStorage - clear those too.
  try {
    ['mkPatientProfile', 'mkPatientProfiles', 'mkPatientActiveProfileId', 'mkPatientToken'].forEach((k) =>
      window.localStorage.removeItem(k)
    );
  } catch {
    // ignore
  }
}

/**
 * REAL BACKEND: POST /api/patient/login-qr { qrToken } -> { token, patient }
 * The scanned value is `MEDIKIOSK:<token>` (see patientQr.js).
 */
export async function patientLoginWithQr(scannedValue) {
  const token = parseQrPayload(scannedValue);
  if (!token) {
    throw new Error('This QR code isn’t a MediKiosk code. Open the MediKiosk app and show your QR code.');
  }
  try {
    const res = await request('POST', '/patient/login-qr', { qrToken: token });
    savePatientSession(res.patient, res.token);
    return res;
  } catch (err) {
    if (err.status === 401 || err.status === 404) {
      err.message = 'QR code not recognized. Please ask the clinic staff for a new code.';
    } else if (err.status === 403) {
      err.message = 'This account can’t check in right now. Please ask the clinic staff for help.';
    }
    throw err;
  }
}
