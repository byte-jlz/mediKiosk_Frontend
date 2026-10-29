import { useNavigate } from 'react-router-dom';
import { DEV_AUTH_BYPASS, devLoginPatient, devLoginStaff } from '../services/devAuth';
import { ROLE_LABELS, homeFor } from '../admin-console/adminRoles';
import './DevSkipLogin.css';

/**
 * DEV-ONLY "skip login" shortcut. Renders nothing outside `npm run dev`.
 *
 * as:   'patient' | 'staff' — which test session to create
 * role: staff only — 'super_admin' | 'clinic_staff' (signs in a demo account)
 * to:   route to open after signing in (staff: defaults to the role's home)
 * onError: staff only — shows the message if the backend isn't running
 */
export default function DevSkipLogin({ as = 'patient', role = 'clinic_staff', to, label, onError }) {
  const navigate = useNavigate();
  if (!DEV_AUTH_BYPASS) return null;

  async function handleClick() {
    if (as === 'staff') {
      try {
        await devLoginStaff(role);
        navigate(to || homeFor(role));
      } catch (err) {
        onError?.(err.message);
      }
      return;
    }
    devLoginPatient();
    navigate(to);
  }

  return (
    <button type="button" className="mk-devskip" onClick={handleClick}>
      <span className="mk-devskip__tag">DEV</span>
      {label || (as === 'staff' ? `Skip login as ${ROLE_LABELS[role]}` : 'Skip login as test patient')}
    </button>
  );
}
