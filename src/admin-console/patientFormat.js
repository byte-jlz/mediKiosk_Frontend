// Shared formatters for the admin Patients list and patient record screens.

export function formatDate(isoDate) {
  if (!isoDate) return '—';
  // Date-only strings (e.g. a birthday) are parsed as local time so they don't shift a day.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? `${isoDate}T00:00:00` : isoDate);
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}

export function formatDateTime(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMetricLabel(key) {
  switch (key) {
    case 'heartRate':
      return 'Heart rate';
    case 'bmi':
      return 'BMI';
    case 'temperature':
      return 'Temperature';
    case 'bloodPressure':
      return 'Blood pressure';
    case 'spo2':
      return 'SpO₂';
    case 'respiration':
      return 'Respiration';
    default:
      return key;
  }
}

export function formatMetricValue(value) {
  if (typeof value === 'object') {
    if ('systolic' in value && 'diastolic' in value) {
      return `${value.systolic}/${value.diastolic} ${value.unit}`;
    }
    return Object.values(value).join(' ');
  }
  return String(value);
}

/** Age in whole years from a YYYY-MM-DD birthday ('' if unknown). */
export function calculateAge(birthday) {
  if (!birthday) return '';
  const dob = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : '';
}

/** epoch seconds (from the backend) -> "October 29, 2026" */
export function formatEpochDate(epochSec) {
  return epochSec ? formatDate(new Date(epochSec * 1000).toISOString()) : '—';
}
