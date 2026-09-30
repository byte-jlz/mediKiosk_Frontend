// ============================================================
// PATIENT QR LOGIN
// ------------------------------------------------------------
// Each patient has a random, secret `qrToken`. Their QR code encodes
// `MEDIKIOSK:<token>` — never the patient ID, which is guessable.
// Regenerating the token invalidates every previously printed code.
// ============================================================

const QR_PREFIX = 'MEDIKIOSK:';

export function generateQrToken() {
  // getRandomValues works on plain-http LAN origins too (unlike crypto.subtle).
  const bytes = window.crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function toQrPayload(token) {
  return `${QR_PREFIX}${token}`;
}

/** Returns the token from a scanned / typed QR value, or null if it isn't a Medi-Kiosk code. */
export function parseQrPayload(value) {
  const text = (value || '').trim();
  if (text.toUpperCase().startsWith(QR_PREFIX)) {
    return text.slice(QR_PREFIX.length).trim().toLowerCase() || null;
  }
  // Allow typing the bare token as a fallback.
  return /^[0-9a-f]{36}$/i.test(text) ? text.toLowerCase() : null;
}
