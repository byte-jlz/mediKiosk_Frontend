// ============================================================
// AUTH SERVICE
// ------------------------------------------------------------
// This file is the ONLY place patient/admin auth logic lives.
// Staff login and patient login / sign-up / QR sign-in call the
// real FastAPI backend (bcrypt passwords, JWT tokens). The signed-in
// patient's profile is kept in localStorage for the kiosk / phone app.
// ============================================================

import { mockCurrentPatient } from '../mocks/mockPatients';
import { AUTH_EVENT, request, setStaffToken } from './apiClient';
import { parseQrPayload } from './patientQr';

const AUTH_STORAGE_KEY = 'mkAdminCurrentStaff';
const PATIENT_PROFILE_KEY = 'mkPatientProfile';
const PATIENT_PROFILES_KEY = 'mkPatientProfiles';
const PATIENT_ACTIVE_PROFILE_ID_KEY = 'mkPatientActiveProfileId';
const FAKE_DELAY_MS = 500;
const DEMO_QR_TOKEN = 'demo-qr-token';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function saveCurrentStaff(staff) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  } catch {
    // ignore storage failures in demo mode
  }
}

function getStoredPatientProfiles() {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PATIENT_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredPatientProfiles(profiles) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PATIENT_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage failures in demo mode
  }
}

function setActivePatientProfileId(profileId) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PATIENT_ACTIVE_PROFILE_ID_KEY, profileId);
  } catch {
    // ignore storage failures in demo mode
  }
}

export function savePatientProfile(profile) {
  if (typeof window === 'undefined') return;

  try {
    const normalizedProfile = {
      ...profile,
      id: profile?.id || `PAT-${Date.now().toString(36)}`,
    };
    const profiles = getStoredPatientProfiles();
    profiles[normalizedProfile.id] = normalizedProfile;
    saveStoredPatientProfiles(profiles);
    window.localStorage.setItem(PATIENT_PROFILE_KEY, JSON.stringify(normalizedProfile));
    setActivePatientProfileId(normalizedProfile.id);
  } catch {
    // ignore storage failures in demo mode
  }
}

export function getCurrentPatientProfile() {
  if (typeof window === 'undefined') return null;

  try {
    const activeId = window.localStorage.getItem(PATIENT_ACTIVE_PROFILE_ID_KEY);
    const profiles = getStoredPatientProfiles();

    if (activeId && profiles[activeId]) {
      return profiles[activeId];
    }

    const raw = window.localStorage.getItem(PATIENT_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) {
        return parsed;
      }
    }

    const firstProfileId = Object.keys(profiles)[0];
    return firstProfileId ? profiles[firstProfileId] : null;
  } catch {
    return null;
  }
}

function clearCurrentStaff() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setStaffToken('');
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  } catch {
    // ignore
  }
}

export function getCurrentStaff() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * REAL BACKEND: POST /api/patient/login { email, password } -> { token, patient }
 * Checked against the patient registry (bcrypt). 401 = wrong email/password,
 * 403 = the record is archived. Used by the kiosk and the phone app.
 */
export async function patientLogin(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  const { token, patient } = await request(
    'POST', '/patient/login', { email: email.trim(), password }, { auth: false });
  savePatientProfile(patient);
  return { token, patient };
}

/**
 * REAL BACKEND: POST /api/patient/signup
 *   { firstName, middleName, lastName, address, dob, bloodType, email, password }
 * -> { token, patient }   (409 if the email is already registered)
 */
export async function patientSignup(formData) {
  const { token, patient } = await request('POST', '/patient/signup', formData, { auth: false });
  savePatientProfile(patient);
  return { token, patient };
}

/**
 * REAL BACKEND: POST /api/patient/login-qr { qrToken } -> { token, patient }
 * qrToken = the scanned code (`MEDIKIOSK:<token>`). Used by the kiosk's
 * "Scan QR Code" sign-in. The phone app's demo QR screen still uses DEMO_QR_TOKEN.
 */
export async function patientLoginWithQr(qrToken) {
  // Legacy simulated flow used by the phone app's "show QR" demo screen.
  if (qrToken === DEMO_QR_TOKEN) {
    await delay(FAKE_DELAY_MS);
    const profile = getCurrentPatientProfile();
    return { token: 'mock-patient-token', patient: profile || mockCurrentPatient };
  }
  const token = parseQrPayload(qrToken);
  if (!token) {
    throw new Error('QR code not recognized. Please ask the clinic staff for a new code.');
  }
  const res = await request('POST', '/patient/login-qr', { qrToken: token }, { auth: false });
  savePatientProfile(res.patient);
  return res;
}

/**
 * REAL BACKEND: POST /api/staff/login  { email, password }
 *   -> { token (JWT), staff: { id, name, email, accessRole, accessRoleLabel, ... } }
 * 401 = wrong email/password, 403 = account suspended.
 * accessRole decides the menu: 'super_admin' or 'clinic_staff' (adminRoles.js).
 */
export async function staffLogin(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }
  const { token, staff } = await request(
    'POST', '/staff/login', { email: email.trim(), password }, { auth: false });
  setStaffToken(token);
  saveCurrentStaff(staff);
  return { token, staff };
}

/** GET /api/staff/me - re-checks the saved token (and picks up role changes). */
export async function refreshCurrentStaff() {
  const staff = await request('GET', '/staff/me');
  saveCurrentStaff(staff);
  return staff;
}

/**
 * POST /api/logout (logged in the audit trail), then forget the token.
 * The token is forgotten even if the server can't be reached.
 */
export async function logout() {
  try {
    await request('POST', '/logout');
  } catch {
    // already expired / server down - still sign out locally
  }
  clearCurrentStaff();
  return { success: true };
}

/** Forget the staff session without calling the server (e.g. token expired). */
export function clearStaffSession() {
  clearCurrentStaff();
}

export function setCurrentStaff(staff) {
  saveCurrentStaff(staff);
}
