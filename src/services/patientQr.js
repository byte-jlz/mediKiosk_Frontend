// ============================================================
// PATIENT QR LOGIN
// ------------------------------------------------------------
// Each patient has a random, secret `qrToken`. Their QR code encodes
// `MEDIKIOSK:<token>` — never the patient ID, which is guessable.
// ============================================================

const QR_PREFIX = 'MEDIKIOSK:';

/** Returns the token from a scanned / typed QR value, or null if it isn't a MediKiosk code. */
export function parseQrPayload(value) {
  const text = (value || '').trim();
  if (text.toUpperCase().startsWith(QR_PREFIX)) {
    return text.slice(QR_PREFIX.length).trim().toLowerCase() || null;
  }
  // Allow typing the bare token as a fallback.
  return /^[0-9a-f]{36}$/i.test(text) ? text.toLowerCase() : null;
}
