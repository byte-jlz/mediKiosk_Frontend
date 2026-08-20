// Mock kiosks — mirrors the "Kiosks" grid and "Kiosks Health" dashboard panel in Figma.
// Replace with a real fetch to GET /api/kiosks once the backend is live.

export const mockKiosks = [
  {
    id: 'K-01',
    name: 'Lobby — North Gate',
    clinic: 'Northgate Clinic',
    status: 'Online',
    uptime: '99.8%',
    today: 142,
    firmware: '2.4.1',
  },
  {
    id: 'K-02',
    name: 'Reception — Northgate',
    clinic: 'Northgate Clinic',
    status: 'Online',
    uptime: '99.4%',
    today: 98,
    firmware: '2.4.1',
  },
  {
    id: 'K-03',
    name: 'Pharmacy — Bayview',
    clinic: 'Bayview Medical',
    status: 'Idle',
    uptime: '97.1%',
    today: 41,
    firmware: '2.4.1',
  },
  {
    id: 'K-04',
    name: 'Lab Wing — Bayview',
    clinic: 'Bayview Medical',
    status: 'Maintenance',
    uptime: '—',
    today: 0,
    firmware: '2.3.9',
  },
  {
    id: 'K-05',
    name: 'Entrance — Eastside',
    clinic: 'Eastside Family',
    status: 'Online',
    uptime: '99.9%',
    today: 67,
    firmware: '2.4.1',
  },
  {
    id: 'K-06',
    name: 'Lobby — Eastside',
    clinic: 'Eastside Family',
    status: 'Online',
    uptime: '98.9%',
    today: 55,
    firmware: '2.4.1',
  },
];

export const dashboardStats = {
  clinicalStaff: 6,
  clinicalStaffDelta: '+2 this week',
  patientRecords: 1421,
  patientRecordsDelta: '+128 this week',
  kiosksOnline: 3,
  kiosksTotal: 6,
  kiosksAcross: 'Across 3 clinics',
  checkInsToday: 312,
  checkInsDelta: '+18% vs yesterday',
};
