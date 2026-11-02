import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { clearStaffSession, getCurrentStaff, refreshCurrentStaff } from '../services/authService';
import { getStaffToken } from '../services/apiClient';
import { homeFor } from '../admin-console/adminRoles';

/**
 * Wraps every admin page:
 *   <RequireStaff roles={['super_admin']}><StaffAccountsScreen /></RequireStaff>
 *
 * - not signed in            -> /admin (login)
 * - signed in, wrong role    -> that role's own home page
 * - token rejected by server -> /admin with "session expired"
 *
 * The backend checks the role again on every request, so this is about
 * showing the right pages, not the only lock.
 */
export default function RequireStaff({ roles, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [staff, setStaff] = useState(getCurrentStaff());
  const token = getStaffToken();

  // Check the saved token with the server once per page load.
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    refreshCurrentStaff()
      .then((fresh) => alive && setStaff(fresh))
      .catch((err) => {
        if (alive && (err.status === 401 || err.status === 403)) {
          clearStaffSession();
          navigate('/admin', { replace: true, state: { expired: true } });
        }
      });
    return () => {
      alive = false;
    };
  }, [token, navigate]);

  // Any API call that gets a 401 sends us back to the login page.
  useEffect(() => {
    const onExpired = () => {
      clearStaffSession();
      navigate('/admin', { replace: true, state: { expired: true } });
    };
    window.addEventListener('mk-admin-session-expired', onExpired);
    return () => window.removeEventListener('mk-admin-session-expired', onExpired);
  }, [navigate]);

  if (!token || !staff?.accessRole) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(staff.accessRole)) {
    return <Navigate to={homeFor(staff.accessRole)} replace />;
  }
  return children;
}
