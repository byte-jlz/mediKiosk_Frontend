import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getStaff, addStaff, removeStaff } from '../services/staffService';
import './StaffAccountsScreen.css';

export default function StaffAccountsScreen() {
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', age: '', role: 'Nurse', clinic: '' });

  async function refresh() {
    setLoading(true);
    const data = await getStaff(search);
    setStaff(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    await addStaff(newStaff);
    setNewStaff({ name: '', email: '', age: '', role: 'Nurse', clinic: '' });
    setShowAddForm(false);
    refresh();
  }

  async function handleRemove(id) {
    await removeStaff(id);
    refresh();
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
    { key: 'age', label: 'Age' },
    { key: 'role', label: 'Position' },
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
          <button className="mk-staff__delete" onClick={() => handleRemove(row.id)} aria-label={`Remove ${row.name}`}>
            🗑
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Clinic Staff Accounts</p>
            <h1 className="mk-page__title">Staff accounts</h1>
            <p className="mk-page__subtitle">Add, edit and remove clinical staff across all connected clinics.</p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setShowAddForm((v) => !v)}>+ Add account</Button>
          </div>
        </div>

        {showAddForm && (
          <form className="mk-staff__add-form" onSubmit={handleAdd}>
                    <input
              placeholder="Full name"
              value={newStaff.name}
              onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              placeholder="Email"
              type="email"
              value={newStaff.email}
              onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
            />
            <input
              placeholder="Age"
              type="number"
              value={newStaff.age}
              onChange={(e) => setNewStaff((s) => ({ ...s, age: e.target.value }))}
            />
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value }))}
            >
              {['Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Admin'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              placeholder="Clinic"
              value={newStaff.clinic}
              onChange={(e) => setNewStaff((s) => ({ ...s, clinic: e.target.value }))}
            />
            <Button type="submit">Save</Button>
          </form>
        )}

        <DataTable
          columns={columns}
          rows={staff}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No staff accounts match your search."
        />
      </div>

      {selectedStaff && (
        <div className="mk-staff__modal-backdrop" onClick={() => setSelectedStaff(null)}>
          <div className="mk-staff__modal" onClick={(e) => e.stopPropagation()}>
            <button className="mk-staff__modal-close" onClick={() => setSelectedStaff(null)}>✕</button>
            <h2>{selectedStaff.name}</h2>
            <p className="mk-staff__modal-subtitle">{selectedStaff.role} · {selectedStaff.clinic}</p>
            <div className="mk-staff__modal-grid">
              <Field label="Email" value={selectedStaff.email} />
              <Field label="ID" value={selectedStaff.id} />
              <Field label="Age" value={selectedStaff.age || '—'} />
              <Field label="Position" value={selectedStaff.role} />
              <Field label="Clinic" value={selectedStaff.clinic} />
              <Field label="Status" value={selectedStaff.status} />
              <Field label="Last active" value={selectedStaff.lastActive} />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
