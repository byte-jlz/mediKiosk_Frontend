import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getStaff, addStaff, removeStaff, updateStaff, resetStaffPassword, resetStaffMfa } from '../services/staffService';
import { getClinics } from '../services/clinicsService';
import { getCurrentStaff } from '../services/authService';
import './StaffAccountsScreen.css';

export default function StaffAccountsScreen() {
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const me = getCurrentStaff();
  const isSuper = me.accessRole === 'super_admin';
  const blank = { name: '', email: '', username: '', clinic: '', accessRole: 'clinic_staff' };
  const [newStaff, setNewStaff] = useState(blank);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState(null); // { name, email, username, password } shown once
  const [clinics, setClinics] = useState([]);  // a super admin picks from these; an admin's new staff always join the admin's own clinic

  useEffect(() => {
    getClinics().then(setClinics).catch(() => {});
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setStaff(await getStaff(search));
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function act(fn) {
    setError('');
    try {
      return await fn();
    } catch (err) {
      setError(err.message);
      return null;
    }
  }

  function closeAdd() {
    setShowAddForm(false);
    setNewStaff(blank);
    setError('');
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email || !newStaff.username.trim() || (isSuper && !newStaff.clinic)) return;
    const created = await act(() => addStaff(newStaff));
    if (!created) return;
    setSecret({ name: created.name, email: created.email, username: created.username, password: created.temporaryPassword });
    closeAdd();
    refresh();
  }

  async function handleRemove(row) {
    if (!window.confirm(`Delete ${row.name}'s account? This cannot be undone.`)) return;
    if (await act(() => removeStaff(row.id))) refresh();
  }

  async function handleMove(row, clinic) {
    if (!clinic || clinic === row.clinic) return;
    if (!window.confirm(`Move ${row.name} to ${clinic}? They will only see ${clinic}'s kiosks and patients' check-ins from now on.`)) return;
    const updated = await act(() => updateStaff(row.id, { clinic }));
    if (updated) {
      setSelectedStaff(updated);
      refresh();
    }
  }

  async function handleSuspend(row) {
    const next = row.status === 'Suspended' ? 'Active' : 'Suspended';
    if (await act(() => updateStaff(row.id, { status: next }))) {
      setSelectedStaff(null);
      refresh();
    }
  }

  async function handleReset(row) {
    const password = await act(() => resetStaffPassword(row.id));
    if (password) {
      setSelectedStaff(null);
      setSecret({ name: row.name, email: row.email, password });
    }
  }

  async function handleResetMfa(row) {
    if (!window.confirm(`Reset ${row.name}'s two-step sign-in? They are signed out and must set up their authenticator app again at their next sign-in. Only do this after confirming it is really them.`)) return;
    if (await act(() => resetStaffMfa(row.id))) {
      setSelectedStaff(null);
      window.alert(`${row.name}'s two-step sign-in was reset.`);
    }
  }

  // the registered spelling of someone's clinic (stored names may differ in capital letters), so the dropdown shows the right entry
  const clinicOf = (row) => clinics.find((c) => c.name.trim().toLowerCase() === (row.clinic || '').trim().toLowerCase())?.name || row.clinic || '';

  const columns = [
    {
      key: 'name',
      label: 'Staff',
      render: (row) => (
        <div className="mk-staff__cell">
          <div className="mk-staff__avatar">{row.initials}</div>
          <div>
            <p className="mk-staff__name">{row.name}</p>
            <p className="mk-staff__email">{row.email}{row.username ? ` · @${row.username}` : ''} · {row.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Access level' },
    { key: 'clinic', label: 'Clinic' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'lastActive', label: 'Last active' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="mk-staff__actions">
          <button className="mk-staff__view" onClick={() => setSelectedStaff(row)}>
            View
          </button>
          <button className="mk-staff__delete" onClick={() => handleRemove(row)} aria-label={`Remove ${row.name}`}>
            🗑
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader title="Staff accounts" />
      {error && !showAddForm && <p className="mk-staff__error">{error}</p>}
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__subtitle">{isSuper ? 'Create and manage admin and clinic staff accounts.' : 'Create and manage clinic staff accounts.'}</p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setShowAddForm(true)}>+ Add account</Button>
          </div>
        </div>


        <DataTable
          searchPlaceholder="Search by name, email, username or ID"
          columns={columns}
          rows={staff}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No staff accounts match your search."
        />
      </div>

      {showAddForm && (
        <div className="mk-staff__modal-backdrop" onClick={closeAdd}>
          <form className="mk-staff__modal mk-staff__modal--form" role="dialog" aria-label="Add account" onClick={(e) => e.stopPropagation()} onSubmit={handleAdd}>
            <button type="button" className="mk-staff__modal-close" onClick={closeAdd} aria-label="Close">✕</button>
            <h2>Add account</h2>
            <p className="mk-staff__modal-subtitle">
              {isSuper ? 'Create an admin or clinic staff account.' : 'Create a clinic staff account.'} A temporary password is generated for them.
            </p>
            <label className="mk-staff__label">
              <span>Full name</span>
              <input autoFocus value={newStaff.name} onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))} />
            </label>
            <label className="mk-staff__label">
              <span>Email</span>
              <input type="email" value={newStaff.email} onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))} />
            </label>
            <label className="mk-staff__label">
              <span>Username</span>
              <input value={newStaff.username} autoCapitalize="none" spellCheck={false} maxLength={30} placeholder="e.g. ana.cruz"
                onChange={(e) => setNewStaff((s) => ({ ...s, username: e.target.value }))} />
              <small>3-30 letters, numbers, dot, dash or underscore. They can sign in with this or their email.</small>
            </label>
            {isSuper && (
              <label className="mk-staff__label">
                <span>Access level</span>
                <select value={newStaff.accessRole} onChange={(e) => setNewStaff((s) => ({ ...s, accessRole: e.target.value }))}>
                  <option value="clinic_staff">Clinic Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            )}
            <label className="mk-staff__label">
              <span>Clinic</span>
              {isSuper ? (
                <select value={newStaff.clinic} onChange={(e) => setNewStaff((s) => ({ ...s, clinic: e.target.value }))} required>
                  <option value="">{clinics.length ? 'Choose a clinic' : 'No clinics yet: add one on the Clinics page'}</option>
                  {clinics.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <>
                  <input value={me.clinic || ''} disabled readOnly />
                  <small>{me.clinic ? 'New staff join your clinic.' : 'No clinic is assigned to your account yet. Ask a super admin.'}</small>
                </>
              )}
            </label>
            {error && <p className="mk-staff__form-error" role="alert">{error}</p>}
            <div className="mk-staff__modal-actions">
              <Button type="button" variant="secondary" onClick={closeAdd}>Cancel</Button>
              <Button type="submit" disabled={!newStaff.name || !newStaff.email || !newStaff.username.trim() || (isSuper ? !newStaff.clinic : !me.clinic)}>Create account</Button>
            </div>
          </form>
        </div>
      )}

      {selectedStaff && (
        <div className="mk-staff__modal-backdrop" onClick={() => setSelectedStaff(null)}>
          <div className="mk-staff__modal" onClick={(e) => e.stopPropagation()}>
            <button className="mk-staff__modal-close" onClick={() => setSelectedStaff(null)}>✕</button>
            <h2>{selectedStaff.name}</h2>
            <p className="mk-staff__modal-subtitle">{selectedStaff.role} · {selectedStaff.clinic || 'No clinic set'}</p>
            <div className="mk-staff__modal-grid">
              <Field label="Email" value={selectedStaff.email} />
              <Field label="Username" value={selectedStaff.username || '—'} />
              <Field label="ID" value={selectedStaff.id} />
              <Field label="Access level" value={selectedStaff.role} />
              {isSuper && selectedStaff.accessRole !== 'super_admin' ? (
                <div className="mk-staff__field">
                  <span>Clinic</span>
                  <select value={clinicOf(selectedStaff)} onChange={(e) => handleMove(selectedStaff, e.target.value)}>
                    {!clinics.some((c) => c.name === clinicOf(selectedStaff)) && (
                      <option value={selectedStaff.clinic || ''} disabled>{selectedStaff.clinic ? `${selectedStaff.clinic} (not a registered clinic)` : 'Choose a clinic'}</option>
                    )}
                    {clinics.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <Field label="Clinic" value={selectedStaff.clinic} />
              )}
              <Field label="Status" value={selectedStaff.status} />
              <Field label="Last active" value={selectedStaff.lastActive} />
            </div>
            <div className="mk-staff__modal-actions">
              <Button variant="secondary" onClick={() => handleReset(selectedStaff)}>Reset password</Button>
              <Button variant="secondary" onClick={() => handleResetMfa(selectedStaff)}>Reset 2-step sign-in</Button>
              <Button variant="secondary" onClick={() => handleSuspend(selectedStaff)}>
                {selectedStaff.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {secret && (
        <div className="mk-staff__modal-backdrop">
          <div className="mk-staff__modal" role="dialog" aria-label="Temporary password">
            <h2>Temporary password</h2>
            <p className="mk-staff__modal-subtitle">For {secret.name} ({secret.username || secret.email})</p>
            <p className="mk-staff__secret">{secret.password}</p>
            <p className="mk-staff__modal-subtitle">
              Give this to them privately. It is shown only once, and they must choose their own password when they first sign in.
            </p>
            <div className="mk-staff__modal-actions">
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(secret.password)}>Copy</Button>
              <Button onClick={() => setSecret(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value }) {
  return (
    <div className="mk-staff__field">
      <span>{label}</span>
      <p>{value || '—'}</p>
    </div>
  );
}
