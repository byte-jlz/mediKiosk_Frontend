import { useNavigate } from 'react-router-dom';
import { DEV_AUTH_BYPASS, devLoginPatient, devLoginStaff } from '../services/devAuth';
import './DevSkipLogin.css';

/**
 * DEV-ONLY "skip login" shortcut. Renders nothing outside `npm run dev`.
 *
 * as: 'patient' | 'staff' — which test session to create
 * to: route to open after signing in
 */
export default function DevSkipLogin({ as = 'patient', to, label }) {
  const navigate = useNavigate();
  if (!DEV_AUTH_BYPASS) return null;

  function handleClick() {
    if (as === 'staff') {
      devLoginStaff();
    } else {
      devLoginPatient();
    }
    navigate(to);
  }

  return (
    <button type="button" className="mk-devskip" onClick={handleClick}>
      <span className="mk-devskip__tag">DEV</span>
      {label || (as === 'staff' ? 'Skip login as test admin' : 'Skip login as test patient')}
    </button>
  );
}
