// ============================================================
// API CLIENT (kiosk -> FastAPI)
// ------------------------------------------------------------
// One small fetch wrapper for every backend call the kiosk makes.
// The kiosk never sends a staff token - the kiosk endpoints are open
// to the kiosk tablet (see backend/app/security.py).
// ============================================================

// The backend's address WITHOUT "/api" and without a slash at the end - but
// forgive both, so ".../" or ".../api" in .env still works.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

// Shown once in the browser console (F12), so you can see which server the kiosk uses.
console.info(`[api] kiosk backend: ${API_BASE_URL}  (VITE_API_BASE_URL in .env - restart "npm run dev" after changing it)`);

/**
 * request('POST', '/patient/login-qr', { qrToken })  -> parsed JSON
 * Throws an Error with `.status` set when the server answers with an error.
 */
export async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const url = `${API_BASE_URL}/api${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // The browser could not even get an answer: wrong address in .env, the backend
    // not allowing this page (CORS_ORIGINS on the backend), or the server is down/asleep.
    // The exact reason is the red CORS / network line just above this one in the console.
    console.error(`[api] ${method} ${url} failed before the server answered (${e.message}). ` +
      'Check: 1) VITE_API_BASE_URL is the BACKEND address (open <it>/health -> {"ok":true}), ' +
      '2) the backend\'s CORS_ORIGINS includes ' + window.location.origin + ', 3) the backend is awake.');
    const err = new Error("Can't reach the clinic server. Please ask the clinic staff for help.");
    err.status = 0;
    throw err;
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!isJson) {
    // An HTML page came back instead of the API's JSON: the address is a WEBSITE, not the backend.
    console.error(`[api] ${url} answered with a web page, not the API - VITE_API_BASE_URL points to the wrong server.`);
  }
  const data = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail.map((d) => d.msg).join(', ') : data.detail;
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
