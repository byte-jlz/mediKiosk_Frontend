// ============================================================
// STAFF SERVICE
// ------------------------------------------------------------
// Powers the admin console's "Staff Accounts" screen.
// Swap the bodies below for real fetch() calls to FastAPI.
// ============================================================

const STAFF_STORAGE_KEY = 'mkStaffAccounts';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let staffData = loadStaffStore();

function loadStaffStore() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STAFF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStaffStore() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffData));
  } catch {
    // ignore storage failures in demo mode
  }
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/staff?search=...
 * RESPONSE: [{ id, name, email, role, clinic, status, lastActive }, ...]
 */
export async function getStaff(searchTerm = '') {
  await delay(400);
  if (!searchTerm) return staffData;
  const term = searchTerm.toLowerCase();
  return staffData.filter(
    (s) =>
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term)
  );
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/staff
 * REQUEST BODY: { name, email, role, clinic }
 * RESPONSE: the created staff record
 */
export async function getStaffByEmail(email) {
  await delay(100);
  return staffData.find((s) => s.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function addStaff(staffMember) {
  await delay(400);
  const newStaff = {
    id: `S-${1000 + staffData.length + 30}`,
    status: 'Online',
    lastActive: 'just now',
    initials: staffMember.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    ...staffMember,
  };
  staffData = [...staffData, newStaff];
  saveStaffStore();
  return newStaff;
}

/**
 * EXPECTED BACKEND ENDPOINT: DELETE /api/staff/{id}
 */
export async function removeStaff(id) {
  await delay(300);
  staffData = staffData.filter((s) => s.id !== id);
  saveStaffStore();
  return { success: true };
}

/**
 * EXPECTED BACKEND ENDPOINT: PATCH /api/staff/{id}
 * REQUEST BODY: partial fields to update, e.g. { status: 'Suspended' }
 */
export async function updateStaff(id, updates) {
  await delay(300);
  staffData = staffData.map((s) => (s.id === id ? { ...s, ...updates } : s));
  saveStaffStore();
  return staffData.find((s) => s.id === id);
}
