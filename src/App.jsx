import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingScreen from './patient-app/LandingScreen';
import SignInScreen from './patient-app/SignInScreen';
import SignUpScreen from './patient-app/SignUpScreen';
import QrLoginScreen from './patient-app/QrLoginScreen';
import VitalsHomeScreen from './patient-app/VitalsHomeScreen';
import ProfileScreen from './patient-app/ProfileScreen';
import SettingsScreen from './patient-app/SettingsScreen';

import KioskLandingScreen from './kiosk-app/KioskLandingScreen';
import KioskSignInScreen from './kiosk-app/KioskSignInScreen';
import KioskQrScanScreen from './kiosk-app/KioskQrScanScreen';
import KioskQrDisplayScreen from './kiosk-app/KioskQrDisplayScreen';
import KioskVitalsWizard from './kiosk-app/KioskVitalsWizard';

import AppSwitcher from './AppSwitcher';
import AdminLoginScreen from './admin-console/AdminLoginScreen';
import AdminSignUpScreen from './admin-console/AdminSignUpScreen';
import DashboardScreen from './admin-console/DashboardScreen';
import StaffAccountsScreen from './admin-console/StaffAccountsScreen';
import PatientRecordsScreen from './admin-console/PatientRecordsScreen';
import KiosksScreen from './admin-console/KiosksScreen';
import KiosksActivityScreen from './admin-console/KiosksActivityScreen';
import AuditLogsScreen from './admin-console/AuditLogsScreen';

export default function App() {
  return (
    <BrowserRouter>
      <AppSwitcher />
      <Routes>
        {/* Redirect root to the app picker */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* ---------- Patient (mobile) app ---------- */}
        <Route path="/app" element={<LandingScreen />} />
        <Route path="/app/sign-in" element={<SignInScreen />} />
        <Route path="/app/sign-up" element={<SignUpScreen />} />
        <Route path="/app/qr-login" element={<QrLoginScreen />} />
        <Route path="/app/vitals" element={<Navigate to="/app/vitals-home" replace />} />
        <Route path="/app/vitals-home" element={<VitalsHomeScreen />} />
        <Route path="/app/profile" element={<ProfileScreen />} />
        <Route path="/app/settings" element={<SettingsScreen />} />

        {/* ---------- Physical kiosk (landscape / Surface Pro) ---------- */}
        <Route path="/kiosk" element={<KioskLandingScreen />} />
        <Route path="/kiosk/sign-in" element={<KioskSignInScreen />} />
        <Route path="/kiosk/qr-scan" element={<KioskQrScanScreen />} />
        <Route path="/kiosk/qr-display" element={<KioskQrDisplayScreen />} />
        <Route path="/kiosk/vitals" element={<KioskVitalsWizard />} />

        {/* ---------- Admin console (desktop web) ---------- */}
        <Route path="/admin" element={<AdminLoginScreen />} />
        <Route path="/admin/signup" element={<AdminSignUpScreen />} />
        <Route path="/admin/dashboard" element={<DashboardScreen />} />
        <Route path="/admin/staff" element={<StaffAccountsScreen />} />
        <Route path="/admin/patients" element={<PatientRecordsScreen />} />
        <Route path="/admin/kiosks" element={<KiosksScreen />} />
        <Route path="/admin/kiosks-activity" element={<KiosksActivityScreen />} />
        <Route path="/admin/audit-logs" element={<AuditLogsScreen />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
