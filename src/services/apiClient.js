// ============================================================
// API CLIENT (admin console -> FastAPI)
// ------------------------------------------------------------
// Adds the staff login token (JWT) to every request. If the backend says the
// token is missing/expired (401), the staff session is cleared and the
// console goes back to the login page.
// ============================================================

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const TOKEN_KEY = 'mkAdminToken';
export const AUTH_EVENT = 'mk-admin-auth-updated';

export function getStaffToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStaffToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked (private mode) - the session just won't survive a refresh
  }
}

/**
 * request('GET', '/staff')            -> parsed JSON
 * request('POST', '/staff', {...})
 * options.auth = false  -> don't send the token (used by the login call)
 */
export async function request(method, path, body, { auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getStaffToken() : '';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Can't reach the server at ${API_BASE_URL} - is the backend running?`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth) {
      // token missing / expired / account deleted -> back to login
      window.dispatchEvent(new CustomEvent('mk-admin-session-expired'));
    }
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join(', ')
      : data.detail;
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
