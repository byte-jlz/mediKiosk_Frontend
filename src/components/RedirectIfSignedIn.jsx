import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentStaff, homeFor } from '../services/authService';
import { sessionEvent } from '../services/api';

/**
 * For pages meant for signed-out visitors only (the sign-in page). Someone who is already signed in, in this tab or in
 * another tab of the same browser, goes straight to their own home page instead. To use a different account, sign out first.
 * The sign-in steps (code, setup, recovery codes) only save the session when they finish, so they are never cut short.
 */
export default function RedirectIfSignedIn({ children }) {
  const [staff, setStaff] = useState(getCurrentStaff());

  useEffect(() => {
    const update = () => setStaff(getCurrentStaff());
    window.addEventListener(sessionEvent('staff'), update);
    return () => window.removeEventListener(sessionEvent('staff'), update);
  }, []);

  if (staff) return <Navigate to={staff.mustChangePassword ? '/change-password' : homeFor(staff)} replace />;
  return children;
}
