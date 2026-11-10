// ============================================================
// DEV AUTH BYPASS
// ------------------------------------------------------------
// DEVELOPER-ONLY: lets us sign in a test patient on the QR screen
// without a real QR code.
//
// Enabled only while running `npm run dev` (import.meta.env.DEV),
// so Vite strips it out of production builds entirely. It can also
// be switched off in dev by setting VITE_DEV_AUTH_BYPASS=false in .env.
// ============================================================

import { savePatientSession } from './authService';

export const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';

export const DEV_PATIENT = {
  id: 'PAT-DEV-0001',
  firstName: 'Dev',
  lastName: 'Patient',
};

/** Signs in the dev test patient for this check-in. */
export function devLoginPatient() {
  if (!DEV_AUTH_BYPASS) return null;
  savePatientSession(DEV_PATIENT);
  return DEV_PATIENT;
}
