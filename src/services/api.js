// ============================================================
// API CLIENT + SESSIONS
// ------------------------------------------------------------
// Every call to the FastAPI backend goes through api(). It adds the
// login token, turns error replies into readable messages, and signs
// the user out if the token has expired.
//
// Two separate sessions: the staff console (clinic staff / admin /
// super admin) and the patient app. Both are kept in localStorage, so
// every tab of the same browser shares one sign-in and a new tab does
// not ask again. The token still expires on the server (8 hours by
// default) and signing out in one tab signs out all of them.
// ============================================================

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const STORES = {
  staff: { storage: 'localStorage', key: 'mkStaffSession', event: 'mk-staff-session' },
  patient: { storage: 'localStorage', key: 'mkPatientSession', event: 'mk-patient-session' },
};

function store(kind) {
  try {
    return window[STORES[kind].storage];
  } catch {
    return null;
  }
}

export function getSession(kind) {
  try {
    const raw = store(kind)?.getItem(STORES[kind].key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(kind, session) {
  try {
    store(kind)?.setItem(STORES[kind].key, JSON.stringify(session));
  } catch {
    // storage blocked: the user simply has to sign in again next time
  }
  window.dispatchEvent(new CustomEvent(STORES[kind].event));
}

export function clearSession(kind) {
  try {
    store(kind)?.removeItem(STORES[kind].key);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(STORES[kind].event));
}

export function sessionEvent(kind) {
  return STORES[kind].event;
}

// The browser tells OTHER tabs when localStorage changes. Turn that into the same event the app already listens to,
// so signing in or out in one tab updates the rest (a signed-out tab goes back to the sign-in page).
window.addEventListener('storage', (e) => {
  for (const kind of Object.keys(STORES)) {
    if (e.key === STORES[kind].key || e.key === null) window.dispatchEvent(new CustomEvent(STORES[kind].event));
  }
});

function messageFrom(body, status) {
  const d = body?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d) && d.length) {
    const first = d[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : '';
    return field ? `${field}: ${first.msg}` : first.msg;
  }
  if (status === 403) return 'Your account is not allowed to do that.';
  return `Something went wrong (${status}).`;
}

/**
 * api('/api/patients', { as: 'staff', method: 'POST', body: {...} })
 * as: 'staff' | 'patient' | undefined (no login needed)
 * token: send this exact token instead of the saved session (used while setting up two-step sign-in)
 */
export async function api(path, { as, method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) {
    headers.Authorization = `Bearer ${token}`; // a short-lived two-step token (setup), not a saved session
  } else if (as) {
    const session = getSession(as);
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // an expired or invalid token on a signed-in call: drop the session
    if (res.status === 401 && as && getSession(as)) clearSession(as);
    const err = new Error(messageFrom(data, res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}
