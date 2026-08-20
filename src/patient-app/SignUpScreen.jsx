import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneShell from './PhoneShell';
import Button from '../components/Button';
import { patientSignup } from '../services/authService';
import './SignUpScreen.css';

const initialForm = {
  lastName: '',
  firstName: '',
  middleName: '',
  address: '',
  dob: '',
  bloodType: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.lastName || !form.firstName || !form.email || !form.password) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await patientSignup(form);
      navigate('/app/vitals-home');
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PhoneShell>
      <div className="mk-signup">
        <div className="mk-signup__header">
          <h1 className="mk-signup__title">Create your patient profile</h1>
          <p className="mk-signup__subtitle">Set up your account to access vital sign check-in history and patient tools.</p>
        </div>

        <form className="mk-signup__form" onSubmit={handleSubmit}>
          <TextField label="Last Name" value={form.lastName} onChange={(v) => update('lastName', v)} />
          <TextField label="First Name" value={form.firstName} onChange={(v) => update('firstName', v)} />
          <TextField label="Middle Name" value={form.middleName} onChange={(v) => update('middleName', v)} />
          <TextField
            label="Address"
            placeholder="Street Name, Barangay, City…"
            value={form.address}
            onChange={(v) => update('address', v)}
          />

          <div className="mk-signup__row">
            <div className="mk-signup__field">
              <span className="mk-signup__label">Date of birth</span>
              <input
                type="date"
                className="mk-signup__input"
                value={form.dob}
                onChange={(e) => update('dob', e.target.value)}
              />
            </div>
            <div className="mk-signup__field">
              <span className="mk-signup__label">Blood Type</span>
              <select
                className="mk-signup__input"
                value={form.bloodType}
                onChange={(e) => update('bloodType', e.target.value)}
              >
                <option value="">Select</option>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextField
            label="Email"
            type="email"
            placeholder="patient@gmail.com"
            value={form.email}
            onChange={(v) => update('email', v)}
          />
          <TextField
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(v) => update('password', v)}
          />
          <TextField
            label="Confirm Password"
            type="password"
            placeholder="At least 8 characters"
            value={form.confirmPassword}
            onChange={(v) => update('confirmPassword', v)}
          />

          {error && <p className="mk-signup__error">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>

          <button type="button" className="mk-signup__login-link" onClick={() => navigate('/app/sign-in')}>
            Already have an account? Log in
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}

function TextField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="mk-signup__field">
      <span className="mk-signup__label">{label}</span>
      <input
        type={type}
        className="mk-signup__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
