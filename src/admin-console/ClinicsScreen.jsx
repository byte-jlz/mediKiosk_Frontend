import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import { getClinics, addClinic, renameClinic, removeClinic } from '../services/clinicsService';
import './KiosksScreen.css';

// Super admin only. Clinics are created here first; kiosks and staff accounts are then assigned to one of them.
export default function ClinicsScreen() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setClinics(await getClinics());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function act(fn) {
    setError('');
    try {
      await fn();
      await refresh();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await act(() => addClinic(name))) setName('');
  }

  function handleRename(row) {
    const next = window.prompt(`Rename "${row.name}" to:`, row.name);
    if (next && next.trim() && next.trim() !== row.name) act(() => renameClinic(row.id, next));
  }

  function handleRemove(row) {
    if (window.confirm(`Delete the clinic "${row.name}"?`)) act(() => removeClinic(row.id));
  }

  const t = search.trim().toLowerCase();
  const rows = t ? clinics.filter((c) => c.name.toLowerCase().includes(t)) : clinics;
  const columns = [
    { key: 'name', label: 'Clinic' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'kiosks', label: 'Kiosks' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="mk-staff__actions">
          <button className="mk-staff__view" onClick={() => handleRename(row)}>Rename</button>
          <button className="mk-staff__delete" onClick={() => handleRemove(row)} aria-label={`Delete ${row.name}`}>🗑</button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader title="Clinics" />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <p className="mk-page__subtitle">
            Add each clinic here first. Kiosks and staff accounts are then assigned to one, and each clinic only sees its own.
          </p>
        </div>
        {error && <p className="mk-kiosks__empty" role="alert">{error}</p>}
        <form className="mk-kiosks__add-form" onSubmit={handleAdd}>
          <input placeholder="New clinic name" aria-label="Clinic name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name.trim()}>+ Add clinic</Button>
        </form>
        <DataTable
          searchPlaceholder="Search clinics"
          columns={columns}
          rows={rows}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No clinics yet. Add the first one above."
        />
      </div>
    </AdminLayout>
  );
}
