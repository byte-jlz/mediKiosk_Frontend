import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { addStaff } from '../services/staffService';
import { setCurrentStaff } from '../services/authService';
import LobbyArtPanel from '../kiosk-app/LobbyArtPanel';
import './AdminLoginScreen.css';

export default function AdminSignUpScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', age: '', role: 'Doctor', clinic: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.age || !form.role || !form.clinic) {
      setError('Please complete all fields before creating the account.');
      return;
    }

    setLoading(true);
    try {
      const newStaff = await addStaff(form);
      setCurrentStaff(newStaff);
      navigate('/admin/staff');
    } catch (err) {
      setError(err.message || 'Could not create staff account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mk-alogin">
      <div className="mk-alogin__art">
        <LobbyArtPanel />
      </div>

      <div className="mk-alogin__body">
        <h1 className="mk-alogin__logo">Medi-Kiosk</h1>

        <form className="mk-alogin__form" onSubmit={handleSubmit}>
          <label className="mk-alogin__field">
            <span>FULL NAME</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>

          <label className="mk-alogin__field">
            <span>EMAIL</span>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>

          <label className="mk-alogin__field">
            <span>AGE</span>
            <input type="number" value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} />
          </label>

          <label className="mk-alogin__field">
            <span>POSITION</span>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {['Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Admin'].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>

          <label className="mk-alogin__field">
            <span>CLINIC</span>
            <input value={form.clinic} onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))} />
          </label>

          {error && <p className="mk-alogin__error">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'CREATING ACCOUNT…' : 'SIGN UP'}
          </Button>

          <p className="mk-alogin__hint">
            Already have an account?{' '}
            <button type="button" className="mk-alogin__link" onClick={() => navigate('/admin')}>
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
