// ============================================================
// VITALS SERVICE
// ------------------------------------------------------------
// Powers the 7-step vitals wizard (Heart Rate, BMI, Temperature,
// Blood Pressure, SpO2, Respiration, Results).
//
import { mockCurrentPatient } from '../mocks/mockPatients';
import { saveCheckIn, getPatientById } from './adminStore';
import { getCurrentPatientProfile } from './authService';

// `takeReading(vitalKey)` / `takeBloodPressureReading()` ask the backend's
// POST /api/vitals/scan for a real sensor reading (see backend/app/sensors.py —
// Heart Rate, SpO2, and BMI are backed by real hardware there; the rest are
// simulated server-side until those sensors exist). If the backend can't be
// reached (e.g. it isn't running while doing frontend-only UI work), this
// falls back to the same local random-value simulation used before, so the
// wizard never breaks — just logs a console warning either way.
//
// Set VITE_API_BASE_URL in a .env file if the backend isn't on localhost:8000
// (see .env.example).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Plausible ranges per vital, used only for the mock/demo scan.
const VITAL_RANGES = {
  heartRate: { min: 62, max: 96, unit: 'bpm', decimals: 0 },
  bmi: { min: 18.5, max: 27, unit: 'kg/m²', decimals: 1 },
  temperature: { min: 36.2, max: 37.6, unit: '°C', decimals: 1 },
  systolic: { min: 105, max: 128, unit: 'mmHg', decimals: 0 },
  diastolic: { min: 68, max: 84, unit: 'mmHg', decimals: 0 },
  spo2: { min: 95, max: 99, unit: '%', decimals: 0 },
  respiration: { min: 12, max: 18, unit: 'br/min', decimals: 0 },
};

function randomInRange(min, max, decimals) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

async function scanVital(vitalKey) {
  const res = await fetch(`${API_BASE_URL}/api/vitals/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vitalKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Sensor scan failed (${res.status})`);
  }
  return res.json();
}

/**
 * Takes a real sensor reading for `vitalKey` via the backend. Falls back to
 * a local simulated reading if the backend is unreachable.
 */
export async function takeReading(vitalKey) {
  try {
    return await scanVital(vitalKey);
  } catch (err) {
    console.warn(`[vitalsService] Backend scan for "${vitalKey}" unavailable, using simulated reading:`, err.message);
    const range = VITAL_RANGES[vitalKey];
    await delay(1400); // mimics the few seconds a real sensor scan takes
    return { value: randomInRange(range.min, range.max, range.decimals), unit: range.unit };
  }
}

/**
 * Blood pressure returns two values (systolic/diastolic) instead of one.
 */
export async function takeBloodPressureReading() {
  try {
    return await scanVital('bloodPressure');
  } catch (err) {
    console.warn('[vitalsService] Backend scan for "bloodPressure" unavailable, using simulated reading:', err.message);
    await delay(1400);
    const systolic = randomInRange(VITAL_RANGES.systolic.min, VITAL_RANGES.systolic.max, 0);
    const diastolic = randomInRange(VITAL_RANGES.diastolic.min, VITAL_RANGES.diastolic.max, 0);
    return { systolic, diastolic, unit: 'mmHg' };
  }
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/vitals/check-in
 * REQUEST BODY:
 *   {
 *     patientId: string,
 *     kioskId: string,
 *     readings: {
 *       heartRate: { value, unit },
 *       bmi: { value, unit },
 *       temperature: { value, unit },
 *       bloodPressure: { systolic, diastolic, unit },
 *       spo2: { value, unit },
 *       respiration: { value, unit }
 *     }
 *   }
 * RESPONSE: { success: boolean, checkInId: string, summary: {...} }
 *
 * Called once on the final "Results" step to persist the full
 * check-in. Right now it just resolves — swap in a real POST here.
 */
export async function submitCheckIn(patientId, readings, kiosk) {
  await delay(600);
  // Prefer the stored patient profile if available so the check-in is tied to the real account.
  let patient = getCurrentPatientProfile();

  if (!patient) {
    try {
      const record = getPatientById(patientId);
      if (record && record.id) {
        patient = { id: record.id, firstName: record.firstName, lastName: record.lastName };
      } else {
        patient = mockCurrentPatient;
      }
    } catch {
      patient = mockCurrentPatient;
    }
  }

  saveCheckIn({ kioskId: kiosk.id, kioskName: kiosk.name, patient, readings });
  return { success: true, checkInId: `CHK-${Date.now()}`, readings };
}

/**
 * EXPECTED BACKEND ENDPOINT: GET /api/vitals/history?patientId=...
 * RESPONSE: [{ kioskName, date, vital, status }, ...]
 * Used by the patient app's "Recent History" list.
 */
export async function getVitalsHistory(patientId) {
  await delay(400);
  try {
    const patient = getPatientById(patientId);
    return patient?.visitHistory || [];
  } catch {
    return [];
  }
}
