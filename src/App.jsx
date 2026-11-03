import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireStaff from './components/RequireStaff';
import { getCurrentStaff, homeFor } from './services/authService';
import AdminLoginScreen from './admin-console/AdminLoginScreen';
import ChangePasswordScreen from './admin-console/ChangePasswordScreen';
import DashboardScreen from './admin-console/DashboardScreen';
import QueueScreen from './admin-console/QueueScreen';
import StaffAccountsScreen from './admin-console/StaffAccountsScreen';
import PatientRecordsScreen from './admin-console/PatientRecordsScreen';
import PatientDetailScreen from './admin-console/PatientDetailScreen';
import KiosksScreen from './admin-console/KiosksScreen';
import KiosksActivityScreen from './admin-console/KiosksActivityScreen';
import AuditLogsScreen from './admin-console/AuditLogsScreen';

const CLINIC = ['clinic_staff'];
const ADMIN = ['admin'];
const SUPER = ['super_admin'];

/** Signed in -> your own home page; signed out -> the sign-in page. */
function GoHome() {
  const staff = getCurrentStaff();
  return <Navigate to={staff ? (staff.mustChangePassword ? '/change-password' : homeFor(staff)) : '/sign-in'} replace />;
}

const guard = (roles, el) => <RequireStaff roles={roles}>{el}</RequireStaff>;

// Every role gets its own address prefix: /clinic/..., /admin/..., /super-admin/...
function consoleRoutes(prefix, roles, pages) {
  const P = {
    queue: <QueueScreen />, dashboard: <DashboardScreen />, patients: <PatientRecordsScreen />, patient: <PatientDetailScreen />,
    activity: <KiosksActivityScreen />, staff: <StaffAccountsScreen />, kiosks: <KiosksScreen />, audit: <AuditLogsScreen />,
  };
  const paths = { queue: 'queue', dashboard: 'dashboard', patients: 'patients', patient: 'patients/:patientId', activity: 'kiosks-activity', staff: 'staff', kiosks: 'kiosks', audit: 'audit-logs' };
  return pages.map((k) => <Route key={`${prefix}-${k}`} path={`${prefix}/${paths[k]}`} element={guard(roles, P[k])} />);
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The patient app is the separate MediKiosk Mobile project, so the website is the staff console only. */}
        <Route path="/sign-in" element={<AdminLoginScreen />} />
        <Route path="/change-password" element={<RequireStaff allowPasswordChange><ChangePasswordScreen /></RequireStaff>} />

        {consoleRoutes('/clinic', CLINIC, ['queue', 'dashboard', 'patients', 'patient', 'activity'])}
        {consoleRoutes('/admin', ADMIN, ['dashboard', 'patients', 'patient', 'staff', 'kiosks', 'activity'])}
        {consoleRoutes('/super-admin', SUPER, ['dashboard', 'patients', 'patient', 'staff', 'kiosks', 'activity', 'audit'])}

        {/* bare or old addresses just send you where you belong */}
        <Route path="*" element={<GoHome />} />
      </Routes>
    </BrowserRouter>
  );
}