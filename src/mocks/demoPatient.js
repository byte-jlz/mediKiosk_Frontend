// Dev-only dummy patient (seeded by adminStore.seedDemoPatient) so the admin
// Patients list and patient record screens have something to review.
// Demo password: Demo1234

export const demoPatient = {
  id: 'P-10000',
  firstName: 'Maria',
  middleName: 'Santos',
  lastName: 'Dela Cruz',
  birthday: '1992-03-14',
  sex: 'Female',
  bloodType: 'O+',
  address: '123 Rizal Street, Barangay San Antonio, Quezon City, Metro Manila',
  email: 'maria.delacruz@example.com',
  passwordHash: 'sha256:b22f213ec710f0b0e86297d10279d69171f50f01a04edf40f472a563e7ad8576',
  createdAt: '2026-09-01T09:15:00.000Z',
  registered: true,
};

export const demoPatientCheckIns = [
  {
    id: 'CHK-DEMO-1',
    kioskId: 'K-01',
    kioskName: 'Main Lobby Kiosk',
    timestamp: '2026-09-10T02:30:00.000Z',
    readings: {
      bmi: { value: 23.4, unit: 'kg/m²' },
      heartRate: { value: 78, unit: 'bpm' },
      spo2: { value: 98, unit: '%' },
      temperature: { value: 36.7, unit: '°C' },
      bloodPressure: { systolic: 118, diastolic: 76, unit: 'mmHg' },
    },
  },
  {
    id: 'CHK-DEMO-2',
    kioskId: 'K-01',
    kioskName: 'Main Lobby Kiosk',
    timestamp: '2026-09-28T01:05:00.000Z',
    readings: {
      bmi: { value: 23.6, unit: 'kg/m²' },
      heartRate: { value: 104, unit: 'bpm' },
      spo2: { value: 96, unit: '%' },
      temperature: { value: 37.9, unit: '°C' },
      bloodPressure: { systolic: 128, diastolic: 84, unit: 'mmHg' },
    },
  },
];
