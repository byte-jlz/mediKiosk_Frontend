// ============================================================
// DEV AUTH BYPASS
// ------------------------------------------------------------
// DEVELOPER-ONLY: lets us jump straight into the patient app,
// kiosk, or admin console without typing credentials.
//
// Enabled only while running `npm run dev` (import.meta.env.DEV),
// so Vite strips it out of production builds entirely. It can also
// be switched off in dev by setting VITE_DEV_AUTH_BYPASS=false in .env.
// ============================================================

import { savePatientProfile, setCurrentStaff } from './authService';

export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';

export const DEV_PATIENT = {
  id: 'PAT-DEV-0001',
  firstName: 'Dev',
  middleName: 'T.',
  lastName: 'Patient',
  email: 'dev.patient@medikiosk.dev',
  address: '1 Test Lane, Dev City',
  birthday: '1995-01-01',
  dob: '1995-01-01',
  bloodType: 'O+',
  age: 31,
  gender: 'Other',
};

export const DEV_STAFF = {
  id: 'S-DEV-0001',
  name: 'Dev Admin',
  email: 'dev.admin@medikiosk.dev',
  role: 'Admin',
  clinic: 'Dev Clinic',
  status: 'Online',
  lastActive: 'Just now',
  initials: 'DA',
};

/** Signs in the dev test patient (mobile app + kiosk share this session). */
export function devLoginPatient() {
  if (!DEV_AUTH_BYPASS) return null;
  savePatientProfile(DEV_PATIENT);
  return DEV_PATIENT;
}

/** Signs in the dev test staff account for the admin console. */
export function devLoginStaff() {
  if (!DEV_AUTH_BYPASS) return null;
  setCurrentStaff(DEV_STAFF);
  return DEV_STAFF;
}
