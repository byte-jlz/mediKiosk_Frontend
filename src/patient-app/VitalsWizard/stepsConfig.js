// Config for each step in the vitals wizard. Colors/copy match the Figma screens exactly.
// bloodPressure is special-cased (two values), and heartRateSpo2 is one MAX30102 scan
// that fills both readings.heartRate and readings.spo2 — see the helpers below.

export const VITAL_STEPS = [
  {
    key: 'bmi',
    label: 'BMI',
    icon: '⚖',
    accent: 'var(--vital-bmi)',
    accentBg: 'var(--vital-bmi-bg)',
    description: 'Step onto the platform and stand still while we calculate your body mass index.',
    unitLabel: 'BODY MASS INDEX',
    scanButtonLabel: 'Start Scan',
  },
  {
    key: 'heartRateSpo2',
    label: 'Heart Rate & SpO2',
    icon: '♥',
    accent: 'var(--vital-heart)',
    accentBg: 'var(--vital-heart-bg)',
    description: 'Place your index finger on the optical sensor pad. Stay still while we read your pulse and blood oxygen level.',
    unitLabel: 'HEART RATE · BLOOD OXYGEN',
    scanButtonLabel: 'Start Scan',
    isHeartRateSpo2: true,
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: '🌡',
    accent: 'var(--vital-temp)',
    accentBg: 'var(--vital-temp-bg)',
    description: 'Position your forehead 3 cm from the infrared sensor. The reading will appear in seconds.',
    unitLabel: 'TEMPERATURE',
    scanButtonLabel: 'Continue',
  },
  {
    key: 'bloodPressure',
    label: 'Blood Pressure',
    icon: '💧',
    accent: 'var(--vital-bp)',
    accentBg: 'var(--vital-bp-bg)',
    description: 'Slide your arm into the cuff and rest your palm upward. The cuff will inflate automatically.',
    unitLabel: 'SYSTOLIC / DIASTOLIC',
    scanButtonLabel: 'Continue',
    isBloodPressure: true,
  },
  {
    key: 'respiration',
    label: 'Respiration',
    icon: '🍃',
    accent: 'var(--vital-resp)',
    accentBg: 'var(--vital-resp-bg)',
    description: 'Stay relaxed and breathe normally while your breathing rate is being monitored.',
    unitLabel: 'RESPIRATORY RATE',
    scanButtonLabel: 'Continue',
  },
];

/** The reading(s) a step owns, pulled out of the wizard's `readings` map. */
export function getStepReading(step, readings) {
  if (step.isHeartRateSpo2) {
    return readings.heartRate || readings.spo2
      ? { heartRate: readings.heartRate, spo2: readings.spo2 }
      : undefined;
  }
  return readings[step.key];
}

export function hasStepReading(step, reading) {
  if (step.isBloodPressure) return reading?.systolic != null;
  if (step.isHeartRateSpo2) return reading?.heartRate?.value != null && reading?.spo2?.value != null;
  return reading?.value != null;
}
