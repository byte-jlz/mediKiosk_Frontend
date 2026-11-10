/** "Maria S." - first name + last initial, for the name chip at the top. */
export function shortName(patient) {
  if (!patient) return 'Guest';
  const first = patient.firstName || '';
  const initial = patient.lastName ? ` ${patient.lastName[0]}.` : '';
  return `${first}${initial}`.trim() || 'Patient';
}

export function fullName(patient) {
  return [patient?.firstName, patient?.lastName].filter(Boolean).join(' ');
}
