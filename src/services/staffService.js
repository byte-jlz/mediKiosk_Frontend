// ============================================================
// STAFF SERVICE  (Super Admin: "Manage Clinic staff account")
// Backend: backend/app/routers/staff.py - Super Admin only.
// Passwords are hashed with bcrypt on the server and never sent back.
// ============================================================
import { request } from './apiClient';

const q = (s) => (s ? `?search=${encodeURIComponent(s)}` : '');

/** GET /api/staff -> [{ id, name, email, role, clinic, status, accessRole, accessRoleLabel, ... }] */
export const getStaff = (search = '') => request('GET', `/staff${q(search)}`);

/** POST /api/staff { name, email, role (job title), clinic, accessRole, password } */
export const addStaff = (account) => request('POST', '/staff', account);

/** PATCH /api/staff/{id} - any of name, email, role, clinic, status, accessRole, password */
export const updateStaff = (id, changes) => request('PATCH', `/staff/${encodeURIComponent(id)}`, changes);

/** DELETE /api/staff/{id} */
export const removeStaff = (id) => request('DELETE', `/staff/${encodeURIComponent(id)}`);
