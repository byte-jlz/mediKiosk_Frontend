// The waiting-room queue and urgency tiers. Clinic staff only: the server refuses everyone else.
import { api } from './api';

/** Highest urgency first, then whoever arrived first. */
export const getQueue = () => api('/api/queue', { as: 'staff' });
export const getVisit = (id) => api(`/api/visits/${encodeURIComponent(id)}`, { as: 'staff' });
export const setVisitStatus = (id, status) => api(`/api/visits/${encodeURIComponent(id)}/status`, { as: 'staff', method: 'POST', body: { status } });
/** Staff can raise or lower the tier; a reason is required and the model's own tier is kept on record. */
export const overrideTier = (id, tier, reason, confirmLower = false) =>
  api(`/api/visits/${encodeURIComponent(id)}/override`, { as: 'staff', method: 'POST', body: { tier, reason, confirmLower } });
export const getPatientVisits = (patientId) => api(`/api/visits?patient_ref=${encodeURIComponent(patientId)}&limit=100`, { as: 'staff' }).then((r) => r.items);
