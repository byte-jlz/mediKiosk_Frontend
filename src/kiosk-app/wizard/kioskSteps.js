// ============================================================
// The kiosk check-in steps, in order. Edit names / wording / colors here.
//
// `key` is the vital name the kiosk agent understands (see
// MediKiosk_hardware/agent/README.md) and the backend stores.
// Order: Breathing & oxygen (ONE finger reading) -> Blood pressure +
// heart rate -> Temperature -> BMI (height & weight).
//
// Each step has its own color (accent = buttons/icons, tint = panels,
// ink = headings on the tint). Colors are also in src/index.css.
// ============================================================

export const KIOSK_STEPS = [
  {
    key: 'respirationSpo2Hr',
    name: 'Breathing & Oxygen',
    label: 'Breathing & Oxygen',
    title: 'Breathing & oxygen',
    measures: 'Breathing rate & blood oxygen',
    icon: 'breath',
    color: 'breath',
    description:
      'Please stand comfortably and relax for a moment. Place your fingertip on the sensor to measure your breathing rate and blood oxygen level.',
    duration: 'Takes about 30 seconds',
    tips: [
      'Stand still and relax your body.',
      'Gently place your index fingertip on the sensor pad.',
      'Breathe normally and avoid talking or moving until the measurement is complete.',
    ],
    timerSeconds: 30, // RR_SECONDS in measurements.py (the ring itself uses the agent's countdown)
    measuring: 'Measuring…',
    measuringHint: 'Keep your finger still, breathe normally and avoid talking or moving.',
    recheckTip: 'Relax for a moment, then gently place your fingertip on the pad and keep still.',
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
      'The blood pressure cuff will measure your blood pressure and heart rate at the same time. Please remain still throughout the measurement.',
    duration: 'Takes up to 100 seconds',
    tips: [
      'Stand comfortably and keep your body relaxed.',
      'Slide your arm into the cuff with your palm facing upward.',
      'Keep your arm supported at heart level and remain still until the measurement is complete.',
    ],
    timerSeconds: 100, // the agent's timeout (bp_auto.TIMEOUT) - only used for the ring
    countUp: true, // show the agent's elapsed seconds, not a countdown
    startingLabel: 'Starting the monitor…',
    measuring: 'Measuring…',
    measuringHint:
      'The cuff is measuring your blood pressure and heart rate. Keep your arm still and avoid talking. It may finish early.',
    recheckTip: 'Relax for a minute, then keep your arm supported at heart level and remain still.',
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
      'Your body temperature will be measured automatically using the infrared sensor integrated into the kiosk. Follow the on-screen instructions and remain still while the reading is taken.',
    duration: 'Takes about 5 seconds', // TEMP_SECONDS in measurements.py
    tips: [
      'Locate the temperature sensor on the kiosk.',
      'Position the required body part near the sensor as indicated on the screen.',
      'Remain still until the temperature reading is complete.',
    ],
    timerSeconds: 5, // TEMP_SECONDS in measurements.py (the ring itself uses the agent's countdown)
    measuring: 'Measuring…',
    measuringHint: 'Hold still in front of the sensor until the reading is complete.',
    recheckTip: 'Wait a moment, then position yourself near the sensor again and remain still.',
  },
  {
    key: 'bmi',
    name: 'BMI',
    label: 'BMI',
    title: 'BMI · height & weight',
    measures: 'Height & weight',
    icon: 'bmi',
    color: 'bmi',
    description:
      'We’ll measure your weight using the platform and your height using the sensor above you. Your BMI will automatically be calculated using these measurements.',
    duration: 'Takes about 20 seconds',
    tips: [
      'Remove your shoes and any heavy items from your pockets.',
      'Stand upright on the platform and face forward.',
      'Keep your feet still and look straight ahead while your height and weight are measured.',
    ],
    measuring: 'Stand up straight',
    measuringHint: 'Keep your feet still and look straight ahead while your height is measured.',
  },
];

export const STEP_BY_KEY = Object.fromEntries(KIOSK_STEPS.map((s) => [s.key, s]));

/**
 * The "Your turn" moments the agent asks for (its `step` names -> kiosk wording).
 *   text    the big instruction
 *   sub     the smaller line under it
 *   pill    the timing note under the panel
 *   button  what the patient taps when they're ready
 */
export const CONFIRM_PROMPTS = {
  scale_empty: {
    text: 'Please step OFF the platform so we can zero the scale.',
    sub: 'Keep the platform empty for a moment.',
    button: 'The platform is empty',
  },
  step_on: {
    text: 'Now step onto the platform and stand still.',
    sub: 'Stand in the middle of the platform with both feet.',
    button: 'I’m on the platform',
  },
  stand_under: {
    text: 'Stand up straight under the sensor and look straight ahead.',
    sub: 'Stay on the platform and keep your heels down.',
    button: 'I’m standing straight',
  },
  finger_rest: {
    text: 'Stand and relax. Gently place your index fingertip on the sensor pad.',
    sub: 'Don’t press hard. This one reading measures your breathing rate and blood oxygen.',
    pill: 'A 30-second reading starts when you tap the button', // RR_SECONDS
    button: 'My finger is on the sensor',
  },
  cuff_on: {
    text: 'Slide your arm into the cuff with your palm facing upward.',
    sub: 'Keep your arm supported at heart level. The cuff inflates by itself when you tap the button.',
    pill: 'Measuring takes up to 100 seconds', // bp_auto.TIMEOUT
    button: 'My arm is in the cuff',
  },
  forehead: {
    text: 'Hold your forehead 2–5 cm in front of the infrared sensor.',
    sub: 'Move your hair away from your forehead and keep still until the reading is complete.',
    pill: 'A 5-second reading starts when you tap the button', // TEMP_SECONDS
    button: 'I’m in position',
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

// ============================================================
// BORDERLINE READINGS -> "Let's take that reading once more"
// ------------------------------------------------------------
// If a reading lands within the sensor's margin of error of a clinical
// cut-off, the kiosk asks for ONE repeat measurement. The repeat is then
// accepted as the final reading.
//
// ⚠ PLACEHOLDER VALUES - confirm every cut-off and margin with your
//   adviser and each sensor's datasheet (its stated accuracy) before use.
//   Set `margin` to 0 to switch the repeat off for that value.
// ============================================================
export const BORDERLINE_RULES = {
  bloodPressure: [
    { read: (r) => r.systolic, cutoffs: [140, 180], margin: 3 }, // mmHg
    { read: (r) => r.diastolic, cutoffs: [90, 120], margin: 3 }, // mmHg
  ],
  temperature: [{ read: (r) => r.value, cutoffs: [37.5], margin: 0.2 }], // °C
  respirationSpo2Hr: [
    { read: (r) => r.spo2?.value, cutoffs: [95], margin: 2 }, // %
    { read: (r) => r.respiration?.value, cutoffs: [12, 20], margin: 1 }, // breaths/min
  ],
};

/** True when any value of this reading sits within its margin of a cut-off. */
export function isBorderline(key, reading) {
  const rules = BORDERLINE_RULES[key];
  if (!rules || !reading) return false;
  return rules.some(({ read, cutoffs, margin }) => {
    const v = Number(read(reading));
    if (!margin || Number.isNaN(v)) return false;
    return cutoffs.some((c) => Math.abs(v - c) <= margin);
  });
}

/** BP monitor pulse wins; the finger sensor is the fallback (same rule as the backend). */
export function officialHeartRate(readings) {
  const bp = readings.bloodPressure?.pulse;
  if (bp != null) return { value: Math.round(bp), unit: 'bpm' };
  const finger = readings.respirationSpo2Hr?.heartRate?.value;
  if (finger != null) return { value: Math.round(finger), unit: 'bpm' };
  return null;
}