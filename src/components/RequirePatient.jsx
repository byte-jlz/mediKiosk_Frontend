import { Navigate } from 'react-router-dom';
import { getCurrentPatient } from '../services/authService';

export default function RequirePatient({ children }) {
  return getCurrentPatient() ? children : <Navigate to="/app" replace />;
}
