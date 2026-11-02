import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import PatientFormModal from './PatientFormModal';
import { getPatients } from '../services/patientsService';
import { formatEpochDate } from './patientFormat';
import './PatientRecordsScreen.css';
import './KiosksScreen.css';   // tab styles

/** "Manage patients records" (Super Admin). Archived records are on their own tab. */
export default function PatientRecordsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getPatients(search, archived)
      .then((rows) => {
        setPatients(rows);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, archived]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const openPatient = (row) => navigate(`/admin/patients/${encodeURIComponent(row.id)}`);

  const columns = [
    {
      key: 'name',
      label: 'Patient',
      render: (row) => (
        <div>
          <p className="mk-patients__name">
            {row.firstName} {row.lastName}
          </p>
          <p className="mk-patients__id">{row.id} · {row.email}</p>
        </div>
      ),
    },
    { key: 'age', label: 'Age', render: (row) => row.age ?? '—' },
    { key: 'sex', label: 'Sex', render: (row) => row.sex || '—' },
    { key: 'checkInCount', label: 'Check-ins' },
    { key: 'lastVisit', label: 'Last visit', render: (row) => formatEpochDate(row.lastVisit) },
    {
      key: 'record',
      label: 'Record',
      render: () => <span className="mk-patients__view">View record →</span>,
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Patient Records</p>
            <h1 className="mk-page__title">Patient records</h1>
            <p className="mk-page__subtitle">
              Registered patients. Open a record to correct details, see the patient&apos;s history,
              archive it, or delete it on a data privacy request.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setShowAddForm(true)}>+ Add patient</Button>
          </div>
        </div>

        <div className="mk-kiosks__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!archived}
            className={`mk-kiosks__tab${!archived ? ' is-active' : ''}`}
            onClick={() => setArchived(false)}
          >
            Active records
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={archived}
            className={`mk-kiosks__tab${archived ? ' is-active' : ''}`}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

        <DataTable
          columns={columns}
          rows={patients}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, patient ID or email…"
          loading={loading && patients.length === 0}
          onRowClick={openPatient}
          emptyMessage={archived ? 'No archived records.' : 'No patients match your search.'}
        />
      </div>

      {showAddForm && (
        <PatientFormModal
          onClose={() => setShowAddForm(false)}
          onSaved={(patient) => {
            setShowAddForm(false);
            navigate(`/admin/patients/${encodeURIComponent(patient.id)}`, { state: { justCreated: true } });
          }}
        />
      )}
    </AdminLayout>
  );
}
