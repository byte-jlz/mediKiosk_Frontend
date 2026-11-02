// ============================================================
// The kiosk check-in steps, in order. Edit names / wording / colors here.
//
// `key` is the vital name the kiosk agent understands (see
// MediKiosk_hardware/agent/README.md) and the backend stores.
// Order decided with the team:  BMI -> Respiration + SpO2 + heart rate
// (ONE finger reading) -> Blood pressure -> Temperature.
// ============================================================

export const KIOSK_STEPS = [
  {
    key: 'bmi',
    label: 'BMI',
    icon: '⚖',
    accent: 'var(--vital-bmi)',
    accentBg: 'var(--vital-bmi-bg)',
    description:
      'We will weigh you on the platform, then measure your height with the sensor above you.',
    duration: 'about 20 seconds',
    measuring: 'Stand still…',
    unitLabel: 'BODY MASS INDEX',
    values: (r) => [
      { label: 'BMI', value: r.value, unit: r.unit, main: true },
      r.weight && { label: 'Weight', value: Number(r.weight.value).toFixed(1), unit: r.weight.unit },
      r.height && { label: 'Height', value: r.height.value, unit: r.height.unit },
    ],
  },
  {
    key: 'respirationSpo2Hr',
    label: 'Breathing & Oxygen',
    icon: '🍃',
    accent: 'var(--vital-resp)',
    accentBg: 'var(--vital-resp-bg)',
    description:
      'Please sit down and relax for a moment first. Then one fingertip reading measures your breathing rate, blood oxygen and pulse.',
    duration: 'about 1 minute',
    measuring: "Keep your finger still, don't talk, breathe normally…",
    unitLabel: 'BREATHS PER MINUTE',
    values: (r) => [
      r.respiration && { label: 'Breathing', value: r.respiration.value, unit: r.respiration.unit, main: true },
      r.spo2 && { label: 'Blood oxygen', value: r.spo2.value, unit: r.spo2.unit },
      // The finger sensor's pulse is NOT shown: the official heart rate is the
      // BP monitor's pulse (shown on the results screen). Staff see both.
    ],
  },
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    icon: '💧',
    accent: 'var(--vital-bp)',
    accentBg: 'var(--vital-bp-bg)',
    description:
      'Slide your arm into the cuff and rest your palm upward. The cuff will inflate automatically.',
    duration: 'about 1 minute',
    measuring: "The cuff is measuring - keep your arm still and don't talk…",
    unitLabel: 'SYSTOLIC / DIASTOLIC',
    values: (r) => [
      { label: 'Blood pressure', value: `${r.systolic}/${r.diastolic}`, unit: r.unit, main: true },
      r.pulse != null && { label: 'Pulse', value: r.pulse, unit: 'bpm' },
    ],
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: '🌡',
    accent: 'var(--vital-temp)',
    accentBg: 'var(--vital-temp-bg)',
    description: 'Hold your forehead close to the infrared sensor. The reading takes a few seconds.',
    duration: 'about 5 seconds',
    measuring: 'Hold still…',
    unitLabel: 'TEMPERATURE',
    values: (r) => [{ label: 'Temperature', value: r.value, unit: r.unit, main: true }],
  },
];

export const STEP_BY_KEY = Object.fromEntries(KIOSK_STEPS.map((s) => [s.key, s]));

/** The "I'm ready" moments the agent asks for (its `step` names -> kiosk wording). */
export const CONFIRM_PROMPTS = {
  scale_empty: {
    text: 'Please step OFF the platform so we can zero the scale.',
    button: 'The platform is empty',
  },
  step_on: { text: 'Now step onto the platform and stand still.', button: "I'm on the platform" },
  stand_under: {
    text: 'Stand up straight under the sensor arm and look straight ahead.',
    button: "I'm standing straight",
  },
  finger_rest: {
    text: 'Sit and relax. Rest your index fingertip gently on the sensor pad - do not press hard.',
    button: 'My finger is on the sensor',
  },
  cuff_on: {
    text: 'Slide your arm into the cuff, palm up, with your arm resting at heart level.',
    button: 'The cuff is on',
  },
  forehead: { text: 'Hold your forehead 2-5 cm in front of the infrared sensor.', button: "I'm ready" },
};

/** Live value shown during a countdown (from the agent's `live` field). */
export function formatLive(live) {
  if (!live) return null;
  if (live.kg != null) return `${live.kg.toFixed(1)} kg`;
  if (live.object_c != null) return `${live.object_c.toFixed(1)} °C`;
  return null;
}
