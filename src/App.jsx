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
import KioskTofMonitorScreen from './kiosk-app/KioskTofMonitorScreen';

import AppSwitcher from './AppSwitcher';
import AdminLoginScreen from './admin-console/AdminLoginScreen';
import DashboardScreen from './admin-console/DashboardScreen';
import StaffAccountsScreen from './admin-console/StaffAccountsScreen';
import PatientRecordsScreen from './admin-console/PatientRecordsScreen';
import PatientDetailScreen from './admin-console/PatientDetailScreen';
import KiosksScreen from './admin-console/KiosksScreen';
import KiosksActivityScreen from './admin-console/KiosksActivityScreen';
import AuditLogsScreen from './admin-console/AuditLogsScreen';
import ComingNextScreen from './admin-console/ComingNextScreen';
import LiveDashboardScreen from './admin-console/staff/LiveDashboardScreen';
import PatientQueueScreen from './admin-console/staff/PatientQueueScreen';
import CheckInDetailScreen from './admin-console/staff/CheckInDetailScreen';
import RequireStaff from './components/RequireStaff';
import { CLINIC_STAFF, SUPER_ADMIN } from './admin-console/adminRoles';

// Page guards: which role may open which admin page (use-case diagrams 3.4 / 3.5)
const staffOnly = (page) => <RequireStaff roles={[CLINIC_STAFF]}>{page}</RequireStaff>;
const adminOnly = (page) => <RequireStaff roles={[SUPER_ADMIN]}>{page}</RequireStaff>;

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
        <Route path="/kiosk/tof-live" element={<KioskTofMonitorScreen />} />

        {/* ---------- Admin console (desktop web): one login, menu per role ---------- */}
        <Route path="/admin" element={<AdminLoginScreen />} />
        <Route path="/admin/signup" element={<Navigate to="/admin" replace />} />

        {/* Clinic Staff (Figure 3.4) */}
        <Route path="/admin/live" element={staffOnly(<LiveDashboardScreen />)} />
        <Route path="/admin/queue" element={staffOnly(<PatientQueueScreen />)} />
        <Route path="/admin/queue/:checkInId" element={staffOnly(<CheckInDetailScreen />)} />

        {/* Super Admin (Figure 3.5) */}
        <Route path="/admin/dashboard" element={adminOnly(<DashboardScreen />)} />
        <Route path="/admin/staff" element={adminOnly(<StaffAccountsScreen />)} />
        <Route path="/admin/patients" element={adminOnly(<PatientRecordsScreen />)} />
        <Route path="/admin/patients/:patientId" element={adminOnly(<PatientDetailScreen />)} />
        <Route path="/admin/kiosks" element={adminOnly(<KiosksScreen />)} />
        <Route path="/admin/kiosks-activity" element={adminOnly(<KiosksActivityScreen />)} />
        <Route path="/admin/reports" element={adminOnly(
          <ComingNextScreen title="Reports" useCase="Generate reports (+ export report)" part={3} />)} />
        <Route path="/admin/audit-logs" element={adminOnly(<AuditLogsScreen />)} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
