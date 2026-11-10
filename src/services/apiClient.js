// ============================================================
// API CLIENT (kiosk -> FastAPI)
// ------------------------------------------------------------
// One small fetch wrapper for every backend call the kiosk makes.
// The kiosk never sends a staff token - the kiosk endpoints are open
// to the kiosk tablet (see backend/app/security.py).
// ============================================================

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * request('POST', '/patient/login-qr', { qrToken })  -> parsed JSON
 * Throws an Error with `.status` set when the server answers with an error.
 */
export async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Can't reach the clinic server. Please ask the clinic staff for help.");
    err.status = 0;
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(', ') : data.detail;
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
