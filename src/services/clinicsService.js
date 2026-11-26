// Clinics: the list a super admin maintains. Kiosks and staff accounts are assigned to one of these.
// A super admin gets every clinic; everyone else gets only their own.
import { api } from './api';

export const getClinics = () => api('/api/clinics', { as: 'staff' });
export const addClinic = (name) => api('/api/clinics', { as: 'staff', method: 'POST', body: { name } });
export const renameClinic = (id, name) => api(`/api/clinics/${encodeURIComponent(id)}`, { as: 'staff', method: 'PATCH', body: { name } });
export const removeClinic = (id) => api(`/api/clinics/${encodeURIComponent(id)}`, { as: 'staff', method: 'DELETE' });
