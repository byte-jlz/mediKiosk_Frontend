// ============================================================
// PATIENTS SERVICE
// ------------------------------------------------------------
// Powers the admin console's "Patient Records" screen.
// Swap the bodies below for real fetch() calls to FastAPI.
// ============================================================

import {
  getPatients as getAdminPatients,
  getPatientById as getAdminPatientById,
  addPatient as addAdminPatient,
  updatePatient as updateAdminPatient,
  deletePatient as deleteAdminPatient,
  regeneratePatientQrToken,
} from './adminStore';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/patients?search=...
 * RESPONSE: [{ id, firstName, lastName, age, gender, lastVisit, ... }, ...]
 */
export async function getPatients(searchTerm = '') {
  await delay(400);
  return getAdminPatients(searchTerm);
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/patients/{id}
 * RESPONSE: { id, firstName, lastName, ..., visitHistory: [...] }
 */
export async function getPatientById(id) {
  await delay(300);
  return getAdminPatientById(id);
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/patients
 * REQUEST BODY: { first_name, middle_name, last_name, birthday, sex, blood_type, address, email, password }
 * RESPONSE: the created patient { patient_id, ..., age, created_at } (never the password)
 * The backend owns patient_id, age, created_at and must hash the password (e.g. bcrypt).
 * ERRORS: 409 if the email is already registered
 */
export async function addPatient(patient) {
  await delay(400);
  const { password, ...rest } = patient;
  return addAdminPatient({ ...rest, passwordHash: await hashPassword(password) });
}

/**
 * EXPECTED BACKEND ENDPOINT: PATCH /api/patients/{id}
 * REQUEST BODY: same fields as POST; `password` only when it should change
 * RESPONSE: the updated patient (never the password)
 * ERRORS: 404 if not found, 409 if the email belongs to another patient
 */
export async function updatePatient(id, patient) {
  await delay(400);
  const { password, ...rest } = patient;
  return updateAdminPatient(id, password ? { ...rest, passwordHash: await hashPassword(password) } : rest);
}

/**
 * EXPECTED BACKEND ENDPOINT: DELETE /api/patients/{id}
 * Deletes the patient and all of their vitals / check-in records.
 * RESPONSE: { deletedCheckIns: number }
 */
export async function deletePatient(id) {
  await delay(400);
  return { deletedCheckIns: deleteAdminPatient(id) };
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/patients/{id}/qr-token
 * Issues a new kiosk-login QR token; the old QR code stops working.
 * RESPONSE: { qrToken: string }
 */
export async function regenerateQrToken(id) {
  await delay(300);
  return { qrToken: regeneratePatientQrToken(id) };
}

// Demo-only stand-in for server-side hashing so the plaintext password is never stored.
// crypto.subtle only exists on secure origins (https / localhost), so fall back on plain LAN http.
async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return `sha256:${Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  let hash = 0;
  for (const ch of password) hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0;
  return `demo:${(hash >>> 0).toString(16)}`;
}
