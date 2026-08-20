import { mockKiosks } from '../mocks/mockKiosks';

const STORAGE_KEY = 'mkAdminConsoleStore';

const defaultStore = {
  checkIns: [],
};

let store = loadStore();

function loadStore() {
  if (typeof window === 'undefined') {
    return { ...defaultStore };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...defaultStore };
  } catch {
    return { ...defaultStore };
  }
}

function saveStore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failures in demo mode
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mk-admin-store-updated'));
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getTodaysCount() {
  const today = new Date().toDateString();
  return store.checkIns.filter((checkIn) => new Date(checkIn.timestamp).toDateString() === today).length;
}

function getPreviousDayCount() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayString = yesterday.toDateString();
  return store.checkIns.filter((checkIn) => new Date(checkIn.timestamp).toDateString() === dayString).length;
}

export function saveCheckIn({ kioskId, kioskName, patient, readings }) {
  const timestamp = new Date().toISOString();
  const checkIn = {
    id: `CHK-${Date.now()}`,
    kioskId,
    kioskName,
    patientId: patient.id,
    patient,
    readings,
    timestamp,
  };

  store = {
    ...store,
    checkIns: [...store.checkIns, checkIn],
  };
  saveStore();
  return checkIn;
}

export function getCheckIns() {
  return [...store.checkIns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getPatients(searchTerm = '') {
  const patientsMap = new Map();
  store.checkIns.forEach((checkIn) => {
    const prev = patientsMap.get(checkIn.patientId);
    const record = {
      id: checkIn.patientId,
      firstName: checkIn.patient.firstName,
      lastName: checkIn.patient.lastName,
      age: checkIn.patient.age || '',
      gender: checkIn.patient.gender || '',
      bloodType: checkIn.patient.bloodType || '',
      email: checkIn.patient.email || '',
      address: checkIn.patient.address || '',
      lastVisit: checkIn.timestamp,
    };

    if (!prev || new Date(record.lastVisit) > new Date(prev.lastVisit)) {
      patientsMap.set(checkIn.patientId, record);
    }
  });

  const patients = Array.from(patientsMap.values()).sort(
    (a, b) => new Date(b.lastVisit) - new Date(a.lastVisit)
  );

  if (!searchTerm) {
    return patients;
  }

  const term = searchTerm.toLowerCase();
  return patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
  );
}

function classifyReadingSeverity(readings) {
  const statuses = [];

  if (readings.heartRate) {
    const hr = readings.heartRate.value;
    statuses.push(hr < 60 ? 'Low' : hr > 100 ? 'High' : 'Normal');
  }

  if (readings.bmi) {
    const bmi = readings.bmi.value;
    statuses.push(bmi < 18.5 ? 'Low' : bmi >= 30 ? 'High' : bmi >= 25 ? 'Moderate' : 'Normal');
  }

  if (readings.temperature) {
    const temp = readings.temperature.value;
    statuses.push(temp < 36 ? 'Low' : temp > 37.5 ? 'High' : 'Normal');
  }

  if (readings.spo2) {
    const spo2 = readings.spo2.value;
    statuses.push(spo2 < 95 ? 'Low' : 'Normal');
  }

  if (readings.respiration) {
    const resp = readings.respiration.value;
    statuses.push(resp < 12 ? 'Low' : resp > 20 ? 'High' : 'Normal');
  }

  if (readings.bloodPressure) {
    const { systolic, diastolic } = readings.bloodPressure;
    statuses.push(
      systolic < 90 || diastolic < 60
        ? 'Low'
        : systolic > 140 || diastolic > 90
        ? 'High'
        : 'Normal'
    );
  }

  if (statuses.includes('High')) return 'High';
  if (statuses.includes('Moderate')) return 'Moderate';
  if (statuses.includes('Low')) return 'Low';
  return 'Normal';
}

function formatVisitSummary(readings) {
  if (readings.bloodPressure) {
    return `${readings.bloodPressure.systolic}/${readings.bloodPressure.diastolic} ${readings.bloodPressure.unit}`;
  }
  if (readings.heartRate) {
    return `${readings.heartRate.value} ${readings.heartRate.unit}`;
  }
  return 'Vitals recorded';
}

function getPatientHistory(patientId) {
  return getCheckIns()
    .filter((checkIn) => checkIn.patientId === patientId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((checkIn) => ({
      id: checkIn.id,
      kioskName: checkIn.kioskName,
      timestamp: checkIn.timestamp,
      date: formatTimestamp(checkIn.timestamp),
      status: classifyReadingSeverity(checkIn.readings),
      primaryValue: formatVisitSummary(checkIn.readings),
      summary: `Recorded during kiosk check-in at ${checkIn.kioskName}.`,
      readings: checkIn.readings,
    }));
}

export function getPatientById(id) {
  const record = getPatients().find((p) => p.id === id);
  return record ? { ...record, visitHistory: getPatientHistory(id) } : null;
}

export function getDashboardStats() {
  const checkInsToday = getTodaysCount();
  const checkInsYesterday = getPreviousDayCount();
  const patientRecords = new Set(store.checkIns.map((checkIn) => checkIn.patientId)).size;
  const kiosksOnline = mockKiosks.filter((kiosk) => kiosk.status === 'Online').length;

  const delta = checkInsToday - checkInsYesterday;
  const checkInsDelta = checkInsYesterday === 0
    ? checkInsToday > 0
      ? `+${checkInsToday} today`
      : 'No new check-ins'
    : `${delta >= 0 ? '+' : ''}${delta} vs yesterday`;

  return {
    clinicalStaff: 0,
    clinicalStaffDelta: 'Add staff to see coverage',
    patientRecords,
    patientRecordsDelta: `${patientRecords} active patients`,
    kiosksOnline,
    kiosksTotal: mockKiosks.length,
    kiosksAcross: `Across ${new Set(mockKiosks.map((k) => k.clinic)).size} clinics`,
    checkInsToday,
    checkInsDelta,
  };
}

export function getKioskActivity() {
  return getCheckIns().map((checkIn) => ({
    time: formatTime(checkIn.timestamp),
    event: `${checkIn.patient.firstName} ${checkIn.patient.lastName} completed a kiosk scan`,
    kiosk: `${checkIn.kioskName} · ${checkIn.kioskId}`,
    patient: checkIn.patientId,
  }));
}

export function getRecentActivity() {
  return getCheckIns()
    .slice(0, 4)
    .map((checkIn) => ({
      label: 'Kiosk check-in completed',
      meta: `${checkIn.patient.firstName} ${checkIn.patient.lastName} at ${checkIn.kioskName}`,
      status: 'Online',
    }));
}

export function getAuditLogs(searchTerm = '') {
  const logs = getCheckIns().map((checkIn) => ({
    timestamp: checkIn.timestamp,
    role: 'Kiosk System',
    actor: 'Kiosk Bridge',
    target: `${checkIn.patient.firstName} ${checkIn.patient.lastName}`,
    ip: '192.168.1.10',
    severity: 'Info',
  }));

  if (!searchTerm) {
    return logs;
  }

  const term = searchTerm.toLowerCase();
  return logs.filter(
    (log) =>
      log.actor.toLowerCase().includes(term) ||
      log.role.toLowerCase().includes(term) ||
      log.target.toLowerCase().includes(term)
  );
}

export function getStoreSummary() {
  return {
    checkIns: getCheckIns(),
    patients: getPatients(),
  };
}
