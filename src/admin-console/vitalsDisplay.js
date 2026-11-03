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

/** Which card cells are critical / need a re-check. */
export function cellStates(item) {
  const critical = new Set();
  for (const flag of item.critical_flags || []) {
    const f = parseFlag(flag);
    const cell = f && VITALS.find((v) => v.keys.includes(f.key));
    if (cell) critical.add(cell.id);
  }
  const recheck = new Map(); // cell id -> text for the grey tag
  for (const key of item.outside_range || []) {
    const cell = VITALS.find((v) => v.keys.includes(key));
    if (cell && !recheck.has(cell.id)) recheck.set(cell.id, `${cell.short} (${cell.show(item.vitals)})`);
  }
  return { critical, recheck };
}

export const REVIEW_TEXT = {
  breathing_rate_is_estimate: 'Breathing rate is an estimate from the sensor, not a confirmed count.',
};

/** Short labels for the queue list: which vitals are critical and which need a re-check. */
export function alertsFor(item) {
  const { critical, recheck } = cellStates(item);
  const name = (id) => VITALS.find((v) => v.id === id).short;
  return { critical: [...critical].map(name), recheck: [...recheck.keys()].map(name) };
}
