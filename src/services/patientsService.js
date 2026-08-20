// ============================================================
// PATIENTS SERVICE
// ------------------------------------------------------------
// Powers the admin console's "Patient Records" screen.
// Swap the bodies below for real fetch() calls to FastAPI.
// ============================================================

import { getPatients as getAdminPatients, getPatientById as getAdminPatientById } from './adminStore';

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
