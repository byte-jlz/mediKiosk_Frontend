import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getStaff, addStaff, removeStaff, updateStaff, resetStaffPassword } from '../services/staffService';
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
  const blank = { name: '', email: '', clinic: '', accessRole: 'clinic_staff' };
  const [newStaff, setNewStaff] = useState(blank);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState(null); // { name, email, password } shown once

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
    if (!newStaff.name || !newStaff.email) return;
    const created = await act(() => addStaff(newStaff));
    if (!created) return;
    setSecret({ name: created.name, email: created.email, password: created.temporaryPassword });
    closeAdd();
    refresh();
  }

  async function handleRemove(row) {
    if (!window.confirm(`Delete ${row.name}'s account? This cannot be undone.`)) return;
    if (await act(() => removeStaff(row.id))) refresh();
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

  const columns = [
    {
      key: 'name',
      label: 'Staff',
      render: (row) => (
        <div className="mk-staff__cell">
          <div className="mk-staff__avatar">{row.initials}</div>
          <div>
            <p className="mk-staff__name">{row.name}</p>
            <p className="mk-staff__email">{row.email} · {row.id}</p>
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
          searchPlaceholder="Search by name, email or ID"
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
              <input value={newStaff.clinic} onChange={(e) => setNewStaff((s) => ({ ...s, clinic: e.target.value }))} />
            </label>
            {error && <p className="mk-staff__form-error" role="alert">{error}</p>}
            <div className="mk-staff__modal-actions">
              <Button type="button" variant="secondary" onClick={closeAdd}>Cancel</Button>
              <Button type="submit" disabled={!newStaff.name || !newStaff.email}>Create account</Button>
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
              <Field label="ID" value={selectedStaff.id} />
              <Field label="Access level" value={selectedStaff.role} />
              <Field label="Clinic" value={selectedStaff.clinic} />
              <Field label="Status" value={selectedStaff.status} />
              <Field label="Last active" value={selectedStaff.lastActive} />
            </div>
            <div className="mk-staff__modal-actions">
              <Button variant="secondary" onClick={() => handleReset(selectedStaff)}>Reset password</Button>
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
            <p className="mk-staff__modal-subtitle">For {secret.name} ({secret.email})</p>
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
