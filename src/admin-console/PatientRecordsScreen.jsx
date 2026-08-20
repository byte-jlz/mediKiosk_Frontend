import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { getPatients, getPatientById } from '../services/patientsService';
import './PatientRecordsScreen.css';

export default function PatientRecordsScreen() {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  useEffect(() => {
    if (!selected) {
      setPatientDetails(null);
      return;
    }

    setDetailsLoading(true);
    getPatientById(selected.id).then((data) => {
      setPatientDetails(data);
      setDetailsLoading(false);
    });
  }, [selected]);

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
    { key: 'gender', label: 'Gender' },
    { key: 'lastVisit', label: 'Last visit', render: (row) => formatDate(row.lastVisit) },
    {
      key: 'history',
      label: 'History',
      render: (row) => (
        <button className="mk-patients__view" onClick={() => setSelected(row)}>
          👁 View history
        </button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Patients Records</p>
            <h1 className="mk-page__title">Patient Records</h1>
            <p className="mk-page__subtitle">Browse the full patient roster and review longitudinal visit history.</p>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={patients}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No patients match your search."
        />
      </div>

      {selected && (
        <div className="mk-patients__modal-backdrop" onClick={() => setSelected(null)}>
          <div className="mk-patients__modal" onClick={(e) => e.stopPropagation()}>
            <button className="mk-patients__modal-close" onClick={() => setSelected(null)}>✕</button>
            <h2>{selected.firstName} {selected.middleName} {selected.lastName}</h2>
            <p className="mk-patients__modal-id">{selected.id}</p>
            <div className="mk-patients__modal-grid">
              <Field label="Age" value={selected.age} />
              <Field label="Gender" value={selected.gender} />
              <Field label="Blood Type" value={selected.bloodType} />
              <Field label="Last Visit" value={formatDate(selected.lastVisit)} />
              <Field label="Email" value={selected.email} />
              <Field label="Address" value={selected.address} />
            </div>

            <div className="mk-patient-history">
              <h3>Vitals history</h3>
              {detailsLoading && <p className="mk-patient-history__loading">Loading kiosk history…</p>}
              {!detailsLoading && patientDetails?.visitHistory?.length === 0 && (
                <p className="mk-patient-history__empty">No kiosk check-ins found for this patient.</p>
              )}
              {!detailsLoading && patientDetails?.visitHistory?.map((visit) => (
                <div key={visit.id} className="mk-patient-history__card">
                  <div className="mk-patient-history__head">
                    <div>
                      <p className="mk-patient-history__date">{formatDate(visit.timestamp)}</p>
                      <p className="mk-patient-history__kiosk">{visit.kioskName}</p>
                    </div>
                    <StatusBadge status={visit.status} />
                  </div>
                  <p className="mk-patient-history__summary">{visit.primaryValue} · {visit.summary}</p>
                  <div className="mk-patient-history__metrics">
                    {Object.entries(visit.readings).map(([key, value]) => (
                      <div key={key} className="mk-patient-history__metric">
                        <strong>{formatMetricLabel(key)}</strong>
                        <span>{formatMetricValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, value }) {
  return (
    <div className="mk-patients__field">
      <span>{label}</span>
      <p>{value || '—'}</p>
    </div>
  );
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}

function formatMetricLabel(key) {
  switch (key) {
    case 'heartRate':
      return 'Heart rate';
    case 'bmi':
      return 'BMI';
    case 'temperature':
      return 'Temperature';
    case 'bloodPressure':
      return 'Blood pressure';
    case 'spo2':
      return 'SpO₂';
    case 'respiration':
      return 'Respiration';
    default:
      return key;
  }
}

function formatMetricValue(value) {
  if (typeof value === 'object') {
    if ('systolic' in value && 'diastolic' in value) {
      return `${value.systolic}/${value.diastolic} ${value.unit}`;
    }
    return Object.values(value).join(' ');
  }
  return String(value);
}
