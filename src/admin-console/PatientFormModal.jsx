import { useState } from 'react';
import Button from '../components/Button';
import { addPatient, updatePatient } from '../services/patientsService';
import { calculateAge } from '../services/adminStore';
import { formatDateTime } from './patientFormat';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const SEXES = ['Male', 'Female', 'Bading'];
const MIN_PASSWORD_LENGTH = 8;

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  birthday: '',
  sex: '',
  bloodType: '',
  address: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Add / edit patient form. Pass `patient` to edit an existing record; omit it to add a new one.
 * `onSaved(patient)` is called with the saved record.
 */
export default function PatientFormModal({ patient, onClose, onSaved }) {
  const isEdit = Boolean(patient);
  const [form, setForm] = useState(() => (isEdit ? toForm(patient) : emptyForm));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const age = calculateAge(form.birthday);
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const changingPassword = !isEdit || form.password !== '';
    if (changingPassword && form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (changingPassword && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      const saved = isEdit ? await updatePatient(patient.id, payload) : await addPatient(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save patient.');
      setSaving(false);
    }
  }

  return (
    <div className="mk-patients__modal-backdrop" onClick={onClose}>
      <form
        className="mk-patients__modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button type="button" className="mk-patients__modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{isEdit ? 'Edit patient' : 'Add patient'}</h2>
        <p className="mk-patients__modal-subtitle">
          {isEdit
            ? 'Patient ID and created cannot be changed.'
            : 'Patient ID, Qr code and created date are assigned automatically when you save.'}
        </p>

        <div className="mk-patients__form-grid">
          {isEdit && (
            <>
              <FormField label="Patient ID">
                <input value={patient.id} readOnly tabIndex={-1} />
              </FormField>
              <FormField label="Created" wide>
                <input value={patient.createdAt ? formatDateTime(patient.createdAt) : '—'} readOnly tabIndex={-1} />
              </FormField>
            </>
          )}

          <FormField label="First name" required>
            <input value={form.firstName} onChange={update('firstName')} required autoFocus />
          </FormField>
          <FormField label="Middle name">
            <input value={form.middleName} onChange={update('middleName')} />
          </FormField>
          <FormField label="Last name" required>
            <input value={form.lastName} onChange={update('lastName')} required />
          </FormField>

          <FormField label="Birthday" required>
            <input type="date" value={form.birthday} onChange={update('birthday')} max={today} required />
          </FormField>
          <FormField label="Age">
            <input value={age === '' ? '' : `${age} yrs`} placeholder="From birthday" readOnly tabIndex={-1} />
          </FormField>
          <FormField label="Sex" required>
            <select value={form.sex} onChange={update('sex')} required>
              <option value="" disabled>Select…</option>
              {withCurrent(SEXES, form.sex).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Blood type" required>
            <select value={form.bloodType} onChange={update('bloodType')} required>
              <option value="" disabled>Select…</option>
              {withCurrent(BLOOD_TYPES, form.bloodType).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Email" required wide>
            <input type="email" value={form.email} onChange={update('email')} autoComplete="off" required />
          </FormField>

          <FormField label="Address" required full>
            <input value={form.address} onChange={update('address')} placeholder="Street, barangay, city, province" required />
          </FormField>

          <FormField label={isEdit ? 'New password' : 'Password'} required={!isEdit} wide>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={isEdit ? 'Leave blank to keep current' : undefined}
              required={!isEdit}
            />
          </FormField>
          <FormField label={isEdit ? 'Confirm new password' : 'Confirm password'} required={!isEdit}>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              autoComplete="new-password"
              required={!isEdit || form.password !== ''}
            />
          </FormField>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

        <div className="mk-patients__form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save patient'}</Button>
        </div>
      </form>
    </div>
  );
}

function toForm(patient) {
  return {
    ...emptyForm,
    firstName: patient.firstName || '',
    middleName: patient.middleName || '',
    lastName: patient.lastName || '',
    birthday: patient.birthday || '',
    sex: patient.sex || '',
    bloodType: patient.bloodType || '',
    address: patient.address || '',
    email: patient.email || '',
  };
}

// Keeps a value that isn't in the option list (e.g. from an older kiosk record) selectable.
function withCurrent(options, value) {
  return value && !options.includes(value) ? [value, ...options] : options;
}

function FormField({ label, required, wide, full, children }) {
  const span = full ? ' is-full' : wide ? ' is-wide' : '';
  return (
    <label className={`mk-patients__form-field${span}`}>
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
    </label>
  );
}
