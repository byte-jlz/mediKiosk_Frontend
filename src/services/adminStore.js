import { demoPatient, demoPatientCheckIns } from '../mocks/demoPatient';
import { generateQrToken } from './patientQr';

const STORAGE_KEY = 'mkAdminConsoleStore';

const defaultStore = {
  checkIns: [],
  // Patients registered directly by an admin (may not have any check-ins yet).
  patients: [],
};

let store = loadStore();

function loadStore() {
  if (typeof window === 'undefined') {
    return { ...defaultStore };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultStore, ...JSON.parse(raw) } : { ...defaultStore };
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

/**
 * Updates a patient's profile. Patients that only exist through kiosk check-ins are
 * promoted to a stored record on first edit. Pass `passwordHash` only to change the password.
 * Throws if the patient doesn't exist or the new email belongs to someone else.
 */
export function updatePatient(id, { firstName, middleName, lastName, birthday, sex, bloodType, address, email, passwordHash }) {
  const current = getPatients().find((p) => p.id === id);
  if (!current) {
    throw new Error('Patient not found.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (getPatients().some((p) => p.id !== id && (p.email || '').toLowerCase() === normalizedEmail)) {
    throw new Error('A patient with this email already exists.');
  }

  const stored = store.patients.find((p) => p.id === id);
  const updated = {
    ...(stored || { id, createdAt: current.createdAt, registered: true }),
    firstName: firstName.trim(),
    middleName: middleName.trim(),
    lastName: lastName.trim(),
    age: calculateAge(birthday),
    address: address.trim(),
    birthday,
    bloodType,
    sex,
    email: normalizedEmail,
    ...(passwordHash ? { passwordHash } : {}),
  };

  const { passwordHash: _passwordHash, qrToken: _qrToken, registered: _registered, ...profile } = updated;
  store = {
    ...store,
    patients: stored
      ? store.patients.map((p) => (p.id === id ? updated : p))
      : [...store.patients, updated],
    // Keep the name snapshot on past check-ins in sync (activity feed, audit logs).
    checkIns: store.checkIns.map((checkIn) =>
      checkIn.patientId === id ? { ...checkIn, patient: { ...checkIn.patient, ...profile } } : checkIn
    ),
  };
  saveStore();

  return getPatients().find((p) => p.id === id);
}

/** Finds the patient whose kiosk QR code carries this token (null if none / revoked). */
export function findPatientByQrToken(token) {
  if (!token) return null;
  return getPatients().find((p) => p.qrToken === token) || null;
}

/**
 * Issues a new QR token for a patient, which invalidates their old QR code.
 * Kiosk-only patients are promoted to a stored record so the token can be saved.
 */
export function regeneratePatientQrToken(id) {
  const current = getPatients().find((p) => p.id === id);
  if (!current) {
    throw new Error('Patient not found.');
  }

  const qrToken = generateQrToken();
  const stored = store.patients.find((p) => p.id === id);
  const { lastVisit: _lastVisit, ...profile } = current;

  store = {
    ...store,
    patients: stored
      ? store.patients.map((p) => (p.id === id ? { ...p, qrToken } : p))
      : [...store.patients, { ...profile, qrToken, registered: true }],
  };
  saveStore();

  return qrToken;
}

/**
 * Permanently removes a patient and every kiosk check-in recorded for them.
 * Returns the number of check-ins deleted.
 */
export function deletePatient(id) {
  const removedCheckIns = store.checkIns.filter((checkIn) => checkIn.patientId === id).length;

  store = {
    ...store,
    patients: store.patients.filter((p) => p.id !== id),
    checkIns: store.checkIns.filter((checkIn) => checkIn.patientId !== id),
  };
  saveStore();

  return removedCheckIns;
}

/**
 * DEV-ONLY: adds the dummy patient (and their check-ins) once per browser.
 * The flag keeps it from coming back after the patient is deleted.
 */
export function seedDemoPatient() {
  if (store.demoSeeded) return;
  if (store.patients.some((p) => p.id === demoPatient.id)) {
    store = { ...store, demoSeeded: true };
    saveStore();
    return;
  }

  const { passwordHash: _passwordHash, ...profile } = demoPatient;
  const checkIns = demoPatientCheckIns.map((checkIn) => ({
    ...checkIn,
    patientId: demoPatient.id,
    patient: profile,
  }));

  store = {
    ...store,
    patients: [
      ...store.patients,
      { ...demoPatient, age: calculateAge(demoPatient.birthday), qrToken: generateQrToken() },
    ],
    checkIns: [...store.checkIns, ...checkIns],
    demoSeeded: true,
  };
  saveStore();
}

export function getCheckIns() {
  return [...store.checkIns].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function getPatients(searchTerm = '') {
  const patientsMap = new Map();

  // Admin-registered patients first; strip the password hash before it leaves the store.
  store.patients.forEach(({ passwordHash: _passwordHash, ...patient }) => {
    patientsMap.set(patient.id, { ...patient, lastVisit: null });
  });

  store.checkIns.forEach((checkIn) => {
    const prev = patientsMap.get(checkIn.patientId);

    if (prev?.registered) {
      if (!prev.lastVisit || new Date(checkIn.timestamp) > new Date(prev.lastVisit)) {
        prev.lastVisit = checkIn.timestamp;
      }
      return;
    }

    const record = {
      id: checkIn.patientId,
      firstName: checkIn.patient.firstName,
      middleName: checkIn.patient.middleName || '',
      lastName: checkIn.patient.lastName,
      age: checkIn.patient.age || '',
      sex: checkIn.patient.sex || checkIn.patient.gender || '',
      birthday: checkIn.patient.birthday || checkIn.patient.dob || '',
      bloodType: checkIn.patient.bloodType || '',
      email: checkIn.patient.email || '',
      address: checkIn.patient.address || '',
      createdAt: null,
      lastVisit: checkIn.timestamp,
    };

    if (!prev || new Date(record.lastVisit) > new Date(prev.lastVisit)) {
      patientsMap.set(checkIn.patientId, record);
    }
  });

  const sortKey = (p) => new Date(p.lastVisit || p.createdAt || 0);
  const patients = Array.from(patientsMap.values()).sort((a, b) => sortKey(b) - sortKey(a));

  if (!searchTerm) {
    return patients;
  }

  const term = searchTerm.toLowerCase();
  return patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term) ||
      (p.email || '').toLowerCase().includes(term)
  );
}

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

function nextPatientId() {
  const highest = getPatients().reduce((max, p) => {
    const match = /^P-(\d+)$/.exec(p.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 10000);
  return `P-${highest + 1}`;
}

/**
 * Registers a new patient. `passwordHash` must already be hashed by the caller.
 * Throws if the email is already in use.
 */
export function addPatient({ firstName, middleName, lastName, birthday, sex, bloodType, address, email, passwordHash }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (getPatients().some((p) => (p.email || '').toLowerCase() === normalizedEmail)) {
    throw new Error('A patient with this email already exists.');
  }

  const patient = {
    id: nextPatientId(),
    firstName: firstName.trim(),
    middleName: middleName.trim(),
    lastName: lastName.trim(),
    age: calculateAge(birthday),
    address: address.trim(),
    birthday,
    bloodType,
    sex,
    email: normalizedEmail,
    passwordHash,
    qrToken: generateQrToken(),
    createdAt: new Date().toISOString(),
    registered: true,
  };

  store = {
    ...store,
    patients: [...store.patients, patient],
  };
  saveStore();

  const { passwordHash: _passwordHash, ...publicRecord } = patient;
  return publicRecord;
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
  const patientRecords = getPatients().length;

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
    // Kiosk counts (kiosksOnline / kiosksTotal / kiosksAcross) are added by
    // kiosksService.getDashboardStats(), which owns the live kiosk list.
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
