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
