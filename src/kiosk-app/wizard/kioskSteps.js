// ============================================================
// The kiosk check-in steps, in order. Edit names / wording / colors here.
//
// `key` is the vital name the kiosk agent understands (see
// MediKiosk_hardware/agent/README.md) and the backend stores.
// Order: BMI (height & weight) FIRST - the patient steps on the platform once
// and stays on it - then Breathing & oxygen (ONE finger reading) -> Blood
// pressure + heart rate -> Temperature.
//
// Each step has its own color (accent = buttons/icons, tint = panels,
// ink = headings on the tint). Colors are also in src/index.css.
// ============================================================

export const KIOSK_STEPS = [
  {
    key: 'bmi',
    name: 'BMI',
    label: 'BMI',
    title: 'BMI · height & weight',
    measures: 'Height & weight',
    icon: 'bmi',
    color: 'bmi',
    description:
      'Stay on the platform - no need to step off. We’ll weigh you first, then measure your height with the sensor above you. Your BMI is calculated automatically.',
    duration: 'Takes about 10 seconds',
    tips: [
      'Remove your shoes and any heavy items from your pockets.',
      'Stand in the middle of the platform and face forward.',
      'Tap “Start measuring”, then keep still and look straight ahead until it’s done.',
    ],
    // Nov 2026: what the intro screen shows - short Do / Don't bullets (tips above kept for reference)
    dos: ['Take off your shoes', 'Empty your pockets', 'Stand in the middle, face forward', 'Look straight ahead'],
    donts: ['Hold on to anything', 'Move until it’s done'],
    measuring: 'Stand up straight',
    measuringHint: 'Keep your feet still and look straight ahead while your height is measured.',
  },
  {
    key: 'respirationSpo2Hr',
    name: 'Breathing & Oxygen',
    label: 'Breathing & Oxygen',
    title: 'Breathing & oxygen',
    measures: 'Breathing rate & blood oxygen',
    icon: 'breath',
    color: 'breath',
    description:
      'Please stand comfortably and relax for a moment. Rest your hand flat on the console with your index fingertip on the finger sensor to measure your breathing rate and blood oxygen level.',
    duration: 'Takes about 30 seconds',
    tips: [
      'Stand still and relax your body.',
      'Rest your hand flat with your index fingertip on the finger sensor - don’t press hard.',
      'The reading starts by itself. Breathe normally and avoid talking or moving until it’s done.',
    ],
    dos: ['Rest your hand flat on the console', 'Index fingertip on the sensor', 'Breathe normally'],
    donts: ['Press hard', 'Talk or move'],
    timerSeconds: 30, // RR_SECONDS in measurements.py (the ring itself uses the agent's countdown)
    measuring: 'Measuring…',
    measuringHint: 'Keep your finger still, breathe normally and avoid talking or moving.',
  },
  {
    key: 'bloodPressure',
    name: 'Blood Pressure & Heart Rate',
    label: 'Blood Pressure & Heart Rate',
    title: 'Blood pressure & heart rate',
    measures: 'Blood pressure & heart rate',
    icon: 'bp',
    color: 'bp',
    description:
      'The cuff on the shelf next to the screen measures your blood pressure and heart rate at the same time. Please remain still and don’t talk during the measurement.',
    duration: 'Usually 40 to 70 seconds',
    tips: [
      'Wrap the cuff around your right upper arm, just above the elbow.',
      'Close it snugly — one finger should fit under it.',
      'Rest your arm on the shelf, palm up, at heart level, and keep still until it’s done.',
    ],
    dos: ['Use your right arm', 'Cuff just above the elbow, snug', 'Rest your arm on the shelf, palm up'],
    donts: ['Talk or move', 'Wrap the cuff over thick sleeves'],
    timerSeconds: 100, // the agent's timeout (bp_auto.TIMEOUT) - only used for the ring
    countUp: true, // show the agent's elapsed seconds, not a countdown
    startingLabel: 'Starting the monitor…',
    measuring: 'Measuring…',
    measuringHint:
      'The cuff is measuring your blood pressure and heart rate. Keep your arm still and avoid talking. It may finish early.',
  },
  {
    key: 'temperature',
    name: 'Temperature',
    label: 'Temperature',
    title: 'Temperature',
    measures: 'Body temperature',
    icon: 'temp',
    color: 'temp',
    description:
      'Your body temperature is measured from the inside of your wrist with the infrared sensor at the top, next to the screen. Nothing touches your skin.',
    duration: 'Takes about 5 seconds', // TEMP_SECONDS in measurements.py
    tips: [
      'Pull back your right sleeve.',
      'Hold the inside of your wrist 2–5 cm in front of the top sensor.',
      'The reading starts by itself. Keep your wrist still until it’s done.',
    ],
    dos: ['Pull back your right sleeve', 'Inside of wrist 2–5 cm from the top sensor', 'Keep your wrist still'],
    donts: ['Touch the sensor', 'Move until it’s done'],
    timerSeconds: 5, // TEMP_SECONDS in measurements.py (the ring itself uses the agent's countdown)
    measuring: 'Measuring…',
    measuringHint: 'Hold still in front of the sensor until the reading is complete.',
  },
];

export const STEP_BY_KEY = Object.fromEntries(KIOSK_STEPS.map((s) => [s.key, s]));

/**
 * SpO2 & RR waiting limit (Nov 2026). No finger on the sensor for
 * FINGER_WAIT_LIMIT_S -> "Are you still there?"; nobody answers within
 * STILL_THERE_S -> the check-in is closed (nothing saved) and the kiosk goes
 * back to the start screen after CLOSED_RETURN_S. The agent logs how long each
 * patient needed to place the finger (finger_wait_s) - use that to tune these.
 */
export const FINGER_WAIT_LIMIT_S = 30;
export const STILL_THERE_S = 15;
export const CLOSED_RETURN_S = 5;

/**
 * The "Your turn" moments the agent asks for (its `step` names -> kiosk wording).
 *   text      the big instruction
 *   sub       the smaller line under it
 *   pill      the timing note under the panel
 *   button    what the patient taps when they're ready
 *   autoNote  shown under the button when the agent finishes this step BY ITSELF
 *             (auto-zero scale, Nov 2026) - the button is then only a backup
 *
 * BMI normally has NO prompts at all: the scale zeroes itself between patients,
 * so the patient stays on the platform. scale_empty / step_on only appear in the
 * safety fallback (the zero couldn't be trusted).
 */
export const CONFIRM_PROMPTS = {
  scale_empty: {
    text: 'Please step off the platform for a moment.',
    sub: 'We need to zero the scale before weighing you. Make sure nothing is left on it.',
    button: 'Zero the scale now',
    autoNote: 'Zeroing automatically · tap only if it doesn’t start',
  },
  step_on: {
    text: 'Now step back onto the platform.',
    sub: 'Stand in the middle with both feet and keep still.',
    button: 'I’m on the platform',
    autoNote: 'Weighing starts automatically · tap only if it doesn’t start',
  },
  stand_under: {
    text: 'Stand up straight and look ahead.',
    sub: 'Stay on the platform and keep your heels down.',
    button: 'I’m standing straight',
    autoNote: 'Your height is measured next - it starts by itself',
  },
  finger_rest: {
    text: 'Rest your hand flat on the console, with your index fingertip on the finger sensor.',
    sub: 'Don’t press hard. The reading starts by itself once your finger is steady.',
    button: 'My finger is on the sensor',
    autoNote: 'Starts automatically · tap only if it doesn’t start',
  },
  // after a restart (the finger was off for more than 2 s) and the finger is still off
  finger_again: {
    text: 'Put your finger back on the sensor',
    sub: 'Rest your hand flat with your index fingertip on the sensor. The reading starts again by itself.',
    button: 'My finger is on the sensor',
    autoNote: 'Starts automatically · tap only if it doesn’t start',
  },
  cuff_on: {
    // the patient wraps the cuff themselves (right arm, shelf on the right of the console)
    text: 'Wrap the cuff around your right upper arm, just above the elbow.',
    sub: 'Close it snugly — one finger should fit under it. Then rest your arm on the shelf, palm up, at heart level.',
    button: 'The cuff is on',
    note: 'The cuff inflates by itself after you tap.',
  },
  forehead: {
    // (the agent still calls this step "forehead" - the wording is for the wrist)
    text: 'Hold the inside of your right wrist 2–5 cm in front of the top sensor.',
    sub: 'Pull back your sleeve and turn the inside of your wrist toward the sensor. The reading starts by itself.',
    button: 'I’m in position',
    autoNote: 'Starts automatically · tap only if it doesn’t start',
  },
  // after an automatic restart (the readings were too unsteady) and the wrist is not detected
  temp_again: {
    text: 'Hold your wrist in front of the top sensor again',
    sub: 'Keep the inside of your wrist 2–5 cm from the sensor and hold it still. The reading starts again by itself.',
    button: 'I’m in position',
    autoNote: 'Starts automatically · tap only if it doesn’t start',
  },
};

/** Live value shown while measuring (from the agent's `live` field). */
export function formatLive(live) {
  if (!live) return null;
  if (live.kg != null) return { value: Number(live.kg).toFixed(1), unit: 'kg' };
  if (live.object_c != null) return { value: Number(live.object_c).toFixed(1), unit: '°C' };
  return null;
}

/**
 * The reading shown on the "Reading complete" screen.
 *   main   the big number
 *   extra  smaller tiles under it
 * The finger sensor's pulse is NOT shown: the official heart rate is the
 * BP monitor's pulse. Staff see both.
 */
export function readingDisplay(key, r) {
  if (!r) return null;
  switch (key) {
    case 'bmi':
      return {
        main: { value: r.value, unit: r.unit || 'kg/m²', label: 'BODY MASS INDEX' },
        extra: [
          r.weight && { label: 'WEIGHT', value: Number(r.weight.value).toFixed(1), unit: r.weight.unit },
          r.height && { label: 'HEIGHT', value: r.height.value, unit: r.height.unit },
        ].filter(Boolean),
      };
    case 'respirationSpo2Hr':
      return {
        main: r.respiration && { value: r.respiration.value, unit: r.respiration.unit || '/min', label: 'BREATHING RATE' },
        extra: [r.spo2 && { label: 'BLOOD OXYGEN', value: r.spo2.value, unit: r.spo2.unit || '%' }].filter(Boolean),
      };
    case 'bloodPressure':
      return {
        main: { value: `${r.systolic}/${r.diastolic}`, unit: r.unit || 'mmHg', label: 'BLOOD PRESSURE' },
        extra: [r.pulse != null && { label: 'HEART RATE', value: r.pulse, unit: 'bpm' }].filter(Boolean),
      };
    case 'temperature':
      return { main: { value: r.value, unit: r.unit || '°C', label: 'BODY TEMPERATURE' }, extra: [] };
    default:
      return null;
  }
}

/** BP monitor pulse wins; the finger sensor is the fallback (same rule as the backend). */
export function officialHeartRate(readings) {
  const bp = readings.bloodPressure?.pulse;
  if (bp != null) return { value: Math.round(bp), unit: 'bpm' };
  const finger = readings.respirationSpo2Hr?.heartRate?.value;
  if (finger != null) return { value: Math.round(finger), unit: 'bpm' };
  return null;
}