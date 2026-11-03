// Sign-in, sign-out and "who am I" for both the staff console and the patient app.
import { api, clearSession, getSession, saveSession } from './api';

// ---------------- staff (one login for all three staff roles) ----------------

/** POST /api/staff/login → { token, staff: { name, role, accessRole, mustChangePassword, ... } } */
export async function staffLogin(email, password) {
  const data = await api('/api/staff/login', { method: 'POST', body: { email: email.trim(), password } });
  saveSession('staff', { token: data.token, staff: data.staff });
  return data.staff;
}

/** The signed-in staff member (or null). Includes accessRole: clinic_staff | admin | super_admin. */
export function getCurrentStaff() {
  return getSession('staff')?.staff || null;
}

/** POST /api/staff/change-password */
export async function changeStaffPassword(currentPassword, newPassword) {
  await api('/api/staff/change-password', { as: 'staff', method: 'POST', body: { currentPassword, newPassword } });
  const s = getSession('staff');
  if (s) saveSession('staff', { ...s, staff: { ...s.staff, mustChangePassword: false } });
}

export async function staffLogout() {
  try {
    await api('/api/logout', { as: 'staff', method: 'POST' });
  } catch {
    // signing out locally is enough
  }
  clearSession('staff');
}

/** Each role has its own address prefix, so the URL says whose console you are in. */
const BASES = { clinic_staff: '/clinic', admin: '/admin', super_admin: '/super-admin' };
export const baseFor = (staff) => BASES[staff?.accessRole] || '/clinic';

/** Address of a page in the signed-in person's own console, e.g. staffPath('patients') -> /admin/patients */
export function staffPath(page = '') {
  return `${baseFor(getCurrentStaff())}${page ? `/${page}` : ''}`;
}

/** Where each role lands after signing in. */
export function homeFor(staff) {
  return `${baseFor(staff)}/${staff?.accessRole === 'clinic_staff' ? 'queue' : 'dashboard'}`;
}

// ---------------- patient (mobile app) ----------------

export async function patientLogin(email, password) {
  const data = await api('/api/patient/login', { method: 'POST', body: { email: email.trim(), password } });
  saveSession('patient', { token: data.token, patient: data.patient });
  return data.patient;
}

export async function patientSignup(form) {
  const data = await api('/api/patient/signup', {
    method: 'POST',
    body: {
      firstName: form.firstName.trim(),
      middleName: (form.middleName || '').trim(),
      lastName: form.lastName.trim(),
      address: (form.address || '').trim(),
      birthday: form.dob || null,
      sex: form.sex || null,
      bloodType: form.bloodType || null,
      email: form.email.trim(),
      password: form.password,
    },
  });
  saveSession('patient', { token: data.token, patient: data.patient });
  return data.patient;
}

export function getCurrentPatient() {
  return getSession('patient')?.patient || null;
}

/** Re-reads the profile from the server so the screen never shows stale details. */
export async function refreshPatient() {
  const patient = await api('/api/patient/me', { as: 'patient' });
  const s = getSession('patient');
  if (s) saveSession('patient', { ...s, patient });
  return patient;
}

export async function updatePatientProfile(fields) {
  const patient = await api('/api/patient/me', { as: 'patient', method: 'PATCH', body: fields });
  const s = getSession('patient');
  if (s) saveSession('patient', { ...s, patient });
  return patient;
}

export async function changePatientPassword(currentPassword, newPassword) {
  await api('/api/patient/change-password', { as: 'patient', method: 'POST', body: { currentPassword, newPassword } });
}

/** The patient's own permanent QR text, `MEDIKIOSK:<token>`. */
export async function getMyQr() {
  const { qrToken } = await api('/api/patient/me/qr-token', { as: 'patient' });
  return qrToken;
}

export function patientLogout() {
  clearSession('patient');
}