import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentStaff, homeFor } from '../services/authService';
import { sessionEvent } from '../services/api';

/** Keeps a staff page behind sign-in, and behind the right role. `roles` omitted = any staff role. */
export default function RequireStaff({ roles, children, allowPasswordChange = false }) {
  const [staff, setStaff] = useState(getCurrentStaff());

  useEffect(() => {
    const update = () => setStaff(getCurrentStaff());
    window.addEventListener(sessionEvent('staff'), update);
    return () => window.removeEventListener(sessionEvent('staff'), update);
  }, []);

  if (!staff) return <Navigate to="/sign-in" replace />;
  if (staff.mustChangePassword && !allowPasswordChange) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(staff.accessRole)) return <Navigate to={homeFor(staff)} replace />;
  return children;
}