// Shared labels / formatting for the Clinic Staff screens.

// Order = queue priority (backend/app/triage.py). null = "Not rated":
// the check-in was incomplete, so the risk check did not run.
export const URGENCY_LEVELS = [
  { key: 'high', label: 'High Risk', countKey: 'high' },
  { key: 'medium', label: 'Medium Risk', countKey: 'medium' },
  { key: null, label: 'Not rated', countKey: 'notRated' },
  { key: 'normal', label: 'Normal', countKey: 'normal' },
];

export function urgencyLabel(level) {
  return URGENCY_LEVELS.find((l) => l.key === (level ?? null))?.label || 'Not rated';
}

const VITAL_NAMES = {
  bmi: 'Height & weight (BMI)',
  respirationSpo2Hr: 'Breathing & oxygen',
  bloodPressure: 'Blood pressure',
  temperature: 'Temperature',
};
export const vitalName = (key) => VITAL_NAMES[key] || key;

export function fmtTime(epochSec) {
  if (!epochSec) return '—';
  return new Date(epochSec * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function fmtDateTime(epochSec) {
  if (!epochSec) return '—';
  return new Date(epochSec * 1000).toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** "just now", "4 min", "1 h 12 min" */
export function waitingFor(epochSec, now = Date.now()) {
  if (!epochSec) return '—';
  const min = Math.max(0, Math.floor((now / 1000 - epochSec) / 60));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

const n = (v, digits = 0) => (v === null || v === undefined ? null : Number(v).toFixed(digits));

export function fmtBp(v) {
  return v?.systolic ? `${v.systolic}/${v.diastolic}` : '—';
}

export function fmtVital(value, unit, digits = 0) {
  const s = n(value, digits);
  return s === null ? '—' : `${s}${unit ? ` ${unit}` : ''}`;
}
