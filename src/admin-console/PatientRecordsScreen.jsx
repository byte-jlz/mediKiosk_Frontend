import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import PatientFormModal from './PatientFormModal';
import { getPatients } from '../services/patientsService';
import { formatDate } from './patientFormat';
import './PatientRecordsScreen.css';

export default function PatientRecordsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const loadPatients = () => {
      setLoading(true);
      getPatients(search).then((data) => {
        setPatients(data);
        setLoading(false);
      });
    };

    loadPatients();
    window.addEventListener('mk-admin-store-updated', loadPatients);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadPatients);
    };
  }, [search]);

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
          <p className="mk-patients__id">{row.id}</p>
        </div>
      ),
    },
    { key: 'age', label: 'Age' },
    { key: 'sex', label: 'Sex' },
    { key: 'lastVisit', label: 'Last visit', render: (row) => formatDate(row.lastVisit) },
    {
      key: 'record',
      label: 'Record',
      render: () => <span className="mk-patients__view">View record →</span>,
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Patients</p>
            <h1 className="mk-page__title">Patients</h1>
            <p className="mk-page__subtitle">All registered patients. Select a patient to open their full record.</p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setShowAddForm(true)}>+ Add patient</Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={patients}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          onRowClick={openPatient}
          emptyMessage="No patients match your search."
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
