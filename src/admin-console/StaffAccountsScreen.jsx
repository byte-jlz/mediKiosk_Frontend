import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getStaff, addStaff, updateStaff, removeStaff } from '../services/staffService';
import { getCurrentStaff } from '../services/authService';
import { CLINIC_STAFF, ROLE_LABELS, SUPER_ADMIN } from './adminRoles';
import { fmtAgo } from './kioskFormat';
import './StaffAccountsScreen.css';
import './PatientRecordsScreen.css';   // shared modal + form styles

const POSITIONS = ['Doctor', 'Nurse', 'Triage Nurse', 'Receptionist', 'Pharmacist', 'Medical Technologist', 'IT / Admin'];
const MIN_PASSWORD = 8;
const emptyForm = {
  name: '', email: '', role: 'Nurse', clinic: '', accessRole: CLINIC_STAFF,
  status: 'Active', password: '', confirmPassword: '',
};

const accountStatus = (s) => (s === 'Suspended' ? 'Suspended' : 'Active');

/**
 * "Manage Clinic staff account" (Super Admin) with «include» Add / Edit / Delete Account.
 * Accounts live in the backend; passwords are bcrypt-hashed there.
 */
export default function StaffAccountsScreen() {
  const me = getCurrentStaff();
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);     // null | 'new' | account
  const [deleting, setDeleting] = useState(null);   // account

  const refresh = useCallback(() => {
    setLoading(true);
    getStaff(search)
      .then((rows) => {
        setStaff(rows);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(refresh, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [refresh, search]);

  const columns = [
    {
      key: 'name',
      label: 'Staff',
      render: (row) => (
        <div className="mk-staff__cell">
          <div className="mk-staff__avatar">{row.initials}</div>
          <div>
            <p className="mk-staff__name">
              {row.name}
              {row.id === me.id && <span className="mk-staff__you">You</span>}
            </p>
            <p className="mk-staff__email">{row.email} · {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'accessRole',
      label: 'Access',
      render: (row) => (
        <span className={`mk-staff__access mk-staff__access--${row.accessRole}`}>
          {ROLE_LABELS[row.accessRole] || '—'}
        </span>
      ),
    },
    { key: 'role', label: 'Position' },
    { key: 'clinic', label: 'Clinic' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={accountStatus(row.status)} /> },
    { key: 'lastLoginAt', label: 'Last sign-in', render: (row) => (row.lastLoginAt ? fmtAgo(row.lastLoginAt) : 'not since restart') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="mk-staff__actions">
          <button type="button" className="mk-staff__view" onClick={() => setEditing(row)}>
            Edit
          </button>
          <button
            type="button"
            className="mk-staff__delete"
            onClick={() => setDeleting(row)}
            disabled={row.id === me.id}
            title={row.id === me.id ? "You can't delete your own account" : `Delete ${row.name}`}
            aria-label={`Delete ${row.name}`}
          >
            🗑
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Clinic Staff Accounts</p>
            <h1 className="mk-page__title">Staff accounts</h1>
            <p className="mk-page__subtitle">
              Who can sign in to the console. Clinic Staff see the patient queue and alerts; Super Admins
              manage the system.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setEditing('new')}>+ Add account</Button>
          </div>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

        <DataTable
          columns={columns}
          rows={staff}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, email or position…"
          loading={loading && staff.length === 0}
          emptyMessage="No staff accounts match your search."
        />
      </div>

      {editing && (
        <StaffFormModal
          account={editing === 'new' ? null : editing}
          isMe={editing !== 'new' && editing.id === me.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <DeleteStaffModal
          account={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            refresh();
          }}
        />
      )}
    </AdminLayout>
  );
}

function StaffFormModal({ account, isMe, onClose, onSaved }) {
  const isEdit = Boolean(account);
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...emptyForm, ...account, status: accountStatus(account.status), password: '', confirmPassword: '' }
      : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const positions = form.role && !POSITIONS.includes(form.role) ? [form.role, ...POSITIONS] : POSITIONS;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const changingPassword = !isEdit || form.password !== '';
    if (changingPassword && form.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (changingPassword && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      clinic: form.clinic.trim(),
      accessRole: form.accessRole,
      ...(changingPassword ? { password: form.password } : {}),
      ...(isEdit ? { status: form.status } : {}),
    };
    setSaving(true);
    try {
      if (isEdit) await updateStaff(account.id, body);
      else await addStaff(body);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="mk-patients__modal-backdrop" onClick={onClose}>
      <form className="mk-patients__modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="mk-patients__modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{isEdit ? `Edit ${account.name}` : 'Add staff account'}</h2>
        <p className="mk-patients__modal-subtitle">
          {isEdit
            ? `${account.id} · leave the password blank to keep the current one.`
            : 'The account can sign in right away with this email and password.'}
        </p>

        <div className="mk-patients__form-grid">
          <Field label="Full name" required wide>
            <input value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field label="Email" required>
            <input type="email" value={form.email} onChange={set('email')} required autoComplete="off" />
          </Field>
          <Field label="Position" required>
            <select value={form.role} onChange={set('role')} required>
              {positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Clinic" required wide>
            <input value={form.clinic} onChange={set('clinic')} required placeholder="e.g. Northgate Clinic" />
          </Field>

          <Field label="Access role" required full>
            <div className="mk-staff__radios" role="radiogroup">
              {[CLINIC_STAFF, SUPER_ADMIN].map((r) => (
                <label key={r} className={`mk-staff__radio${form.accessRole === r ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="accessRole"
                    value={r}
                    checked={form.accessRole === r}
                    onChange={set('accessRole')}
                    disabled={isMe}
                  />
                  <strong>{ROLE_LABELS[r]}</strong>
                  <span>
                    {r === CLINIC_STAFF
                      ? 'Patient queue, vital signs, priority alerts, live dashboard'
                      : 'Staff accounts, patient records, kiosks, reports, audit trail'}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {isEdit && (
            <Field label="Account status" full>
              <select value={form.status} onChange={set('status')} disabled={isMe}>
                <option value="Active">Active – can sign in</option>
                <option value="Suspended">Suspended – can't sign in</option>
              </select>
            </Field>
          )}

          <Field label={isEdit ? 'New password' : 'Password'} required={!isEdit} wide>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              placeholder={isEdit ? 'Leave blank to keep current' : `At least ${MIN_PASSWORD} characters`}
              required={!isEdit}
            />
          </Field>
          <Field label="Confirm password" required={!isEdit || form.password !== ''}>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              autoComplete="new-password"
              required={!isEdit || form.password !== ''}
            />
          </Field>
        </div>
        {isMe && <p className="mk-patients__modal-subtitle">You can't change your own access role or suspend yourself.</p>}

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}
        <div className="mk-patients__form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}</Button>
        </div>
      </form>
    </div>
  );
}

function DeleteStaffModal({ account, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleDelete() {
    setBusy(true);
    try {
      await removeStaff(account.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <div className="mk-patients__modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="mk-patients__modal mk-patients__modal--confirm" role="alertdialog" onClick={(e) => e.stopPropagation()}>
        <h2>Delete staff account?</h2>
        <p className="mk-patients__confirm-text">
          <strong>{account.name}</strong> ({account.email}) will no longer be able to sign in. Their past
          actions stay in the audit trail. To block someone only for a while, edit the account and
          suspend it instead.
        </p>
        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}
        <div className="mk-patients__form-actions">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={handleDelete}>{busy ? 'Deleting…' : 'Delete account'}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, wide, full, children }) {
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
