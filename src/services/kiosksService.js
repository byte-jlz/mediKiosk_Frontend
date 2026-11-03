import { api } from './api';

export const getKiosks = () => api('/api/kiosks', { as: 'staff' });
export const getRemovedKiosks = () => api('/api/kiosks?removed=true', { as: 'staff' });
export const addKiosk = ({ id, name, clinic }) => api('/api/kiosks', { as: 'staff', method: 'POST', body: { ...(id ? { id } : {}), name, clinic } });
export const setKioskStatus = (id, status) => api(`/api/kiosks/${encodeURIComponent(id)}`, { as: 'staff', method: 'PATCH', body: { status } });
export const removeKiosk = (id) => api(`/api/kiosks/${encodeURIComponent(id)}`, { as: 'staff', method: 'DELETE' });
export const restoreKiosk = (id) => api(`/api/kiosks/${encodeURIComponent(id)}/restore`, { as: 'staff', method: 'POST' });
export const getKioskActivity = ({ day = '', kiosk = '', clinic = '' } = {}) => {
  const q = new URLSearchParams();
  if (day) q.set('day', day);
  if (kiosk) q.set('kiosk', kiosk);
  if (clinic) q.set('clinic', clinic);
  const qs = q.toString();
  return api(`/api/kiosks/activity${qs ? `?${qs}` : ''}`, { as: 'staff' });
};