// ============================================================
// AUTH SERVICE
// ------------------------------------------------------------
// This file is the ONLY place patient/admin auth logic lives.
// Right now it fakes network calls with a short delay and mock
// data. To connect the real FastAPI backend, replace the body
// of each function with a real fetch() — the screens that call
// these functions do not need to change.
// ============================================================

import { mockCurrentPatient } from '../mocks/mockPatients';
import { getStaffByEmail } from './staffService';

const AUTH_STORAGE_KEY = 'mkAdminCurrentStaff';
const PATIENT_PROFILE_KEY = 'mkPatientProfile';
const PATIENT_PROFILES_KEY = 'mkPatientProfiles';
const PATIENT_ACTIVE_PROFILE_ID_KEY = 'mkPatientActiveProfileId';
const FAKE_DELAY_MS = 500;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function saveCurrentStaff(staff) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
    window.dispatchEvent(new CustomEvent('mk-admin-auth-updated'));
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
    window.dispatchEvent(new CustomEvent('mk-admin-auth-updated'));
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
 * EXPECTED BACKEND ENDPOINT: POST /api/patient/login
 * REQUEST BODY:  { email: string, password: string }
 * RESPONSE:      { token: string, patient: { id, firstName, lastName, ... } }
 * ERRORS:        401 if credentials are invalid
 */
export async function patientLogin(email, password) {
  await delay(FAKE_DELAY_MS);
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const profiles = Object.values(getStoredPatientProfiles());
  const profile = profiles.find((candidate) => candidate?.email && candidate.email.toLowerCase() === email.toLowerCase());

  if (profile) {
    savePatientProfile(profile);
    return { token: 'mock-patient-token', patient: profile };
  }

  const currentProfile = getCurrentPatientProfile();
  if (currentProfile && currentProfile.email && currentProfile.email.toLowerCase() === email.toLowerCase()) {
    savePatientProfile(currentProfile);
    return { token: 'mock-patient-token', patient: currentProfile };
  }

  throw new Error('No patient account found for that email.');
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/patient/signup
 * REQUEST BODY:  { lastName, firstName, middleName, address, dob, bloodType, email, password }
 * RESPONSE:      { token: string, patient: {...} }
 */
export async function patientSignup(formData) {
  await delay(FAKE_DELAY_MS);

  const rawEmail = (formData?.email || '').trim().toLowerCase();
  const existingProfiles = Object.values(getStoredPatientProfiles());
  const existingProfile = existingProfiles.find((candidate) => candidate?.email && candidate.email.toLowerCase() === rawEmail);

  const seed = rawEmail || `${formData?.firstName || 'patient'}${formData?.lastName || 'user'}`.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const patient = {
    ...mockCurrentPatient,
    ...formData,
    email: formData?.email || existingProfile?.email || '',
    id: existingProfile?.id || `PAT-${seed || 'patient'}-${Date.now().toString(36)}`,
  };

  savePatientProfile(patient);
  return { token: 'mock-patient-token', patient };
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/patient/login-qr
 * REQUEST BODY:  { qrToken: string }   -- scanned from the mobile app
 * RESPONSE:      { token: string, patient: {...} }
 * Used by the kiosk's "Scan QR Code" flow to sign a patient in instantly.
 */
export async function patientLoginWithQr(qrToken) {
  await delay(FAKE_DELAY_MS);
  const profile = getCurrentPatientProfile();
  return { token: 'mock-patient-token', patient: profile || mockCurrentPatient };
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/staff/login
 * REQUEST BODY:  { email: string, password: string }
 * RESPONSE:      { token: string, staff: { name, role, initials, ... } }
 * ERRORS:        401 if credentials are invalid
 */
export async function staffLogin(email, password) {
  await delay(FAKE_DELAY_MS);
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const staff = await getStaffByEmail(email);
  if (!staff) {
    throw new Error('No staff account found for that email.');
  }

  saveCurrentStaff(staff);
  return { token: 'mock-staff-token', staff };
}

/**
 * EXPECTED BACKEND ENDPOINT: POST /api/logout
 * Clears the session on the server (e.g. blacklist token / clear cookie).
 */
export async function logout() {
  await delay(200);
  clearCurrentStaff();
  return { success: true };
}

export function setCurrentStaff(staff) {
  saveCurrentStaff(staff);
}
