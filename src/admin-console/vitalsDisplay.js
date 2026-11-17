// Turns the raw numbers and safety flags from the backend into what a nurse reads on a card.

export const TIER_ORDER = ['Normal', 'Low', 'Medium', 'High'];
export const tierRank = (t) => TIER_ORDER.indexOf(t);

// one entry per vital shown on the card; `keys` are the backend field names that belong to it
export const VITALS = [
  { id: 'bp', label: 'Blood pressure', short: 'blood pressure', keys: ['systolic', 'diastolic'], show: (v) => (v.systolic != null ? `${v.systolic}/${v.diastolic ?? '—'} mmHg` : '—') },
  { id: 'hr', label: 'Heart rate', short: 'heart rate', keys: ['heart_rate'], show: (v) => (v.heart_rate != null ? `${v.heart_rate} bpm` : '—') },
  { id: 'spo2', label: 'SpO₂', short: 'SpO₂', keys: ['spo2'], show: (v) => (v.spo2 != null ? `${v.spo2} %` : '—') },
  { id: 'temp', label: 'Temperature', short: 'temperature', keys: ['temperature'], show: (v) => (v.temperature != null ? `${v.temperature} °C` : '—') },
  { id: 'rr', label: 'Respiration', short: 'respiration', keys: ['respiratory_rate'], show: (v) => (v.respiratory_rate != null ? `${v.respiratory_rate} /min` : '—') },
];

const UNITS = { systolic: 'mmHg', diastolic: 'mmHg', heart_rate: 'bpm', spo2: '%', temperature: '°C', respiratory_rate: '/min' };
const NAMES = { systolic: 'Systolic BP', diastolic: 'Diastolic BP', heart_rate: 'Heart rate', spo2: 'SpO₂', temperature: 'Temperature', respiratory_rate: 'Respiration' };

/** 'spo2<=91' -> { key: 'spo2', op: '<=', limit: 91 } */
export function parseFlag(flag) {
  const m = /^([a-z_0-9]+)(<=|>=|<|>)(-?[\d.]+)$/.exec(flag || '');
  return m ? { key: m[1], op: m[2], limit: Number(m[3]) } : null;
}

/** Plain sentence for a critical value, e.g. "SpO₂ 86 % (91 or lower)". */
export function describeFlag(flag, vitals) {
  const f = parseFlag(flag);
  if (!f) return flag;
  const value = vitals?.[f.key];
  const unit = UNITS[f.key] ? ` ${UNITS[f.key]}` : '';
  const rule = f.op === '<=' || f.op === '<' ? `${f.limit} or lower` : `${f.limit} or higher`;
  return `${NAMES[f.key] || f.key} ${value ?? ''}${unit} (${rule})`.replace('  ', ' ');
}

/** Which vital tiles hold a critical value. */
export function cellStates(item) {
  const critical = new Set();
  for (const flag of item.critical_flags || []) {
    const f = parseFlag(flag);
    const cell = f && VITALS.find((v) => v.keys.includes(f.key));
    if (cell) critical.add(cell.id);
  }
  return { critical };
}

export const REVIEW_TEXT = {
  breathing_rate_is_estimate: 'Breathing rate is an estimate from the sensor, not a confirmed count.',
};

/** Short labels for the queue list: which vitals are critical. */
export function alertsFor(item) {
  const { critical } = cellStates(item);
  const name = (id) => VITALS.find((v) => v.id === id).short;
  return { critical: [...critical].map(name) };
}

// ---- model result distribution (queue list + review panel) ----

/** Below this confidence the screening tool is "unsure" and staff should look at the patient themselves. */
export const CONFIDENCE_CUTOFF = 80;

/** Per-tier probabilities as whole percentages, High first. Accepts 0-1 or 0-100 values; null if the kiosk sent none. */
export function tierPercents(item) {
  const raw = item.probabilities;
  if (!raw || typeof raw !== 'object') return null;
  const byName = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), Number(v)]));
  const vals = TIER_ORDER.map((t) => byName[t.toLowerCase()]).filter((n) => Number.isFinite(n));
  if (!vals.length) return null;
  const scale = Math.max(...vals) <= 1 ? 100 : 1;
  return [...TIER_ORDER].reverse().map((t) => ({ tier: t, pct: Math.round((byName[t.toLowerCase()] || 0) * scale) }));
}

/** The model's confidence in its own tier, 0-100, or null when unknown. */
export function confidenceOf(item) {
  const p = tierPercents(item)?.find((x) => x.tier === item.model_tier);
  return p ? p.pct : null;
}

export const isUnsure = (item) => {
  const c = confidenceOf(item);
  return c != null && c < CONFIDENCE_CUTOFF;
};

export const formatSex = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—');