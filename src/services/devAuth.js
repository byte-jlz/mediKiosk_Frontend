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

import { savePatientProfile, staffLogin } from './authService';

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

// Demo staff accounts that exist in backend/app/data.py. "Skip login" really
// signs in with them, so the backend's role checks are exercised too.
export const DEV_STAFF_ACCOUNTS = {
  super_admin: { email: 'superadmin@clinic.io', password: 'Admin@1234' },
  clinic_staff: { email: 'marcus.reyes@clinic.io', password: 'Staff@1234' },
};

/** Signs in the dev test patient (mobile app + kiosk share this session). */
export function devLoginPatient() {
  if (!DEV_AUTH_BYPASS) return null;
  savePatientProfile(DEV_PATIENT);
  return DEV_PATIENT;
}

/** Signs in a demo staff account (role: 'super_admin' | 'clinic_staff'). */
export async function devLoginStaff(role = 'clinic_staff') {
  if (!DEV_AUTH_BYPASS) return null;
  const account = DEV_STAFF_ACCOUNTS[role];
  const { staff } = await staffLogin(account.email, account.password);
  return staff;
}
