// Staff accounts. Admins manage clinic staff; super admins also manage admins.
import { api } from './api';

export const getStaff = (search = '') => api(`/api/staff?search=${encodeURIComponent(search)}`, { as: 'staff' });
/** Returns the new account plus `temporaryPassword` — shown once, the person must change it at first sign-in. */
export const addStaff = ({ name, email, clinic, accessRole }) => api('/api/staff', { as: 'staff', method: 'POST', body: { name, email, clinic, accessRole } });
export const updateStaff = (id, updates) => api(`/api/staff/${encodeURIComponent(id)}`, { as: 'staff', method: 'PATCH', body: updates });
export const removeStaff = (id) => api(`/api/staff/${encodeURIComponent(id)}`, { as: 'staff', method: 'DELETE' });
export const resetStaffPassword = (id) => api(`/api/staff/${encodeURIComponent(id)}/reset-password`, { as: 'staff', method: 'POST' }).then((r) => r.temporaryPassword);
/** Lost phone: turns the person's two-step sign-in off and signs them out. They set it up again at next sign-in. */
export const resetStaffMfa = (id) => api(`/api/staff/${encodeURIComponent(id)}/reset-mfa`, { as: 'staff', method: 'POST' });
