// ============================================================
// PATIENTS SERVICE  (Super Admin: "Manage patients records" + "View patient history")
// Backend: backend/app/routers/patients.py - Super Admin only.
// Passwords are hashed with bcrypt on the server; every view/change is audited.
// ============================================================
import { request } from './apiClient';

const id = (x) => encodeURIComponent(x);

/** GET /api/patients?search=&archived= -> [{ id, firstName, lastName, age, sex, lastVisit, status, ... }] */
export function getPatients(search = '', archived = false) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (archived) params.set('archived', 'true');
  const qs = params.toString();
  return request('GET', `/patients${qs ? `?${qs}` : ''}`);
}

/** GET /api/patients/{id} -> profile + qrToken + history (the patient's real kiosk check-ins) */
export const getPatientById = (patientId) => request('GET', `/patients/${id(patientId)}`);

/** POST /api/patients { firstName, middleName, lastName, birthday, sex, bloodType, address, email, password } */
export const addPatient = (patient) => request('POST', '/patients', patient);

/** PATCH /api/patients/{id} - send `password` only when it should change */
export function updatePatient(patientId, patient) {
  const { password, ...rest } = patient;
  return request('PATCH', `/patients/${id(patientId)}`, password ? { ...rest, password } : rest);
}

/** Archive = hidden from the list and can't sign in at the kiosk. Restore undoes it. */
export const archivePatient = (patientId) => request('POST', `/patients/${id(patientId)}/archive`);
export const restorePatient = (patientId) => request('POST', `/patients/${id(patientId)}/restore`);

/** Privacy request: deletes the patient AND all their check-ins. -> { deletedCheckIns } */
export const deletePatient = (patientId) => request('DELETE', `/patients/${id(patientId)}`);

/** New kiosk-login QR code; the old code stops working. -> { qrToken } */
export const regenerateQrToken = (patientId) => request('POST', `/patients/${id(patientId)}/qr-token`);
