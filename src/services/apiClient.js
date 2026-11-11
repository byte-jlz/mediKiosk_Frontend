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

// With the proxy (default, see vite.config.js) the page calls its OWN server at /api,
// which forwards to API_BASE_URL - so the backend's CORS settings don't matter.
// eslint-disable-next-line no-undef
const VIA_PROXY = typeof __API_PROXY__ !== 'undefined' && __API_PROXY__;
const REQUEST_BASE = VIA_PROXY ? '' : API_BASE_URL;

// Shown once in the browser console (F12), so you can see which server the kiosk uses.
console.info(
  `[api] kiosk backend: ${API_BASE_URL}` +
    (VIA_PROXY ? ' (forwarded by the kiosk\'s own server - no CORS needed)' : ' (called directly - needs CORS on the backend)') +
    '  - set in .env as VITE_API_BASE_URL, restart "npm run dev" after changing it'
);

/**
 * request('POST', '/patient/login-qr', { qrToken })  -> parsed JSON
 * Throws an Error with `.status` set when the server answers with an error.
 */
export async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const url = `${REQUEST_BASE}/api${path}`;
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
      (VIA_PROXY ? '2) "npm run dev" is running, ' : '2) the backend\'s CORS_ORIGINS includes ' + window.location.origin + ', ') +
      '3) the backend is awake.');
    const err = new Error("Can't reach the clinic server. Please ask the clinic staff for help.");
    err.status = 0;
    throw err;
  }

  const type = res.headers.get('content-type') || '';
  const isJson = type.includes('application/json');
  if (type.includes('text/html')) {
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
