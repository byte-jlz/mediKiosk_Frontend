// Patient records (staff console). Admins and super admins see profiles only; clinic staff also see results.
import { api } from './api';

export const getPatients = (search = '') => api(`/api/patients?search=${encodeURIComponent(search)}`, { as: 'staff' });
export const getPatientById = (id) => api(`/api/patients/${encodeURIComponent(id)}`, { as: 'staff' }).catch((e) => (e.status === 404 ? null : Promise.reject(e)));

/** Returns the new patient plus `qrToken` (shown once on the "Patient created" pop-up). */
export const addPatient = (p) => api('/api/patients', { as: 'staff', method: 'POST', body: toBody(p) });
export const updatePatient = (id, p) => api(`/api/patients/${encodeURIComponent(id)}`, { as: 'staff', method: 'PATCH', body: toBody(p) });
export const deletePatient = (id) => api(`/api/patients/${encodeURIComponent(id)}`, { as: 'staff', method: 'DELETE' });

export const getPatientQr = (id) => api(`/api/patients/${encodeURIComponent(id)}/qr-token`, { as: 'staff' }).then((r) => r.qrToken);
/** Issues a new QR; the old one stops working. */
export const regenerateQrToken = (id) => api(`/api/patients/${encodeURIComponent(id)}/qr-token`, { as: 'staff', method: 'POST' }).then((r) => r.qrToken);

/** Patient lost their phone (check who they are first): turns their two-step sign-in off and signs them out of the app. */
export const resetPatientMfa = (id) => api(`/api/patients/${encodeURIComponent(id)}/reset-mfa`, { as: 'staff', method: 'POST' });

function toBody(p) {
  const body = { ...p };
  for (const k of Object.keys(body)) if (body[k] === '' || body[k] === undefined) delete body[k];
  if (p.middleName === '') body.middleName = '';
  return body;
}
