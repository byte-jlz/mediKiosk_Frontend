import { api } from './api';

/** A patient's own past check-ins (readings only: no urgency tier, ever). */
export const getVitalsHistory = (patientId) => api(`/api/vitals/history?patientId=${encodeURIComponent(patientId)}`, { as: 'patient' });
