import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import PatientFormModal from './PatientFormModal';
import PatientQrCode from './PatientQrCode';
import { getPatientById, deletePatient, regenerateQrToken } from '../services/patientsService';
import { formatDate, formatDateTime, formatMetricLabel, formatMetricValue } from './patientFormat';
import './PatientRecordsScreen.css';

export default function PatientDetailScreen() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the Patients screen right after "Add patient" so the new QR code pops up.
  const [showNewQr, setShowNewQr] = useState(Boolean(location.state?.justCreated));
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const loadPatient = () => {
      getPatientById(patientId).then((data) => {
        setPatient(data);
        setLoading(false);
      });
    };

    setLoading(true);
    loadPatient();
    window.addEventListener('mk-admin-store-updated', loadPatient);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadPatient);
    };
  }, [patientId]);

  async function handleRegenerate() {
    setRegenerating(true);
    await regenerateQrToken(patient.id);
    setRegenerating(false);
    setConfirmingRegenerate(false);
  }

  function closeNewQr() {
    setShowNewQr(false);
    // Drop the router state so a refresh doesn't reopen the pop-up.
    navigate(location.pathname, { replace: true, state: null });
  }

  async function handleDelete() {
    setDeleting(true);
    await deletePatient(patient.id);
    navigate('/admin/patients', { replace: true });
  }

  const fullName = patient
    ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <Link to="/admin/patients" className="mk-patient-record__back">
          ← Back to patients
        </Link>

        {loading && <p className="mk-patient-history__loading">Loading patient record…</p>}

        {!loading && !patient && (
          <p className="mk-patient-history__empty">No patient found with ID {patientId}.</p>
        )}

        {!loading && patient && (
          <>
            <div className="mk-page__title-row mk-patient-record__header">
              <div className="mk-patient-record__identity">
                {patient.qrToken ? (
                  <PatientQrCode patient={patient} size={120} compact />
                ) : (
                  <div className="mk-patient-qr__placeholder">
                    <span>No QR code yet</span>
                    <Button onClick={handleRegenerate} disabled={regenerating}>
                      {regenerating ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>
                )}
                <div>
                  <p className="mk-page__eyebrow">Patient record</p>
                  <h1 className="mk-page__title">{fullName}</h1>
                  <p className="mk-page__subtitle">{patient.id}</p>
                  <div className="mk-patient-qr__info">
                    {patient.qrToken ? (
                      <>
                        <p>
                          The patient scans this code at a Medi-Kiosk to sign in without typing their email and
                          password. Treat it like a password. If the code is lost or shared, generate a new one 
                          the old code stops working immediately.
                        </p>
                        <Button variant="ghost" onClick={() => setConfirmingRegenerate(true)}>
                          ↻ Generate new QR code
                        </Button>
                      </>
                    ) : (
                      <p>This patient doesn&apos;t have a kiosk login QR code yet.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mk-page__actions">
                <Button variant="secondary" onClick={() => setEditing(true)}>✎ Edit</Button>
                <Button variant="danger" onClick={() => setConfirmingDelete(true)}>🗑 Delete</Button>
              </div>
            </div>

            <section className="mk-patient-record__card">
              <h3>Personal information</h3>
              <div className="mk-patient-record__grid">
                <Field label="Patient ID" value={patient.id} />
                <Field label="First name" value={patient.firstName} />
                <Field label="Middle name" value={patient.middleName} />
                <Field label="Last name" value={patient.lastName} />
                <Field label="Birthday" value={patient.birthday && formatDate(patient.birthday)} />
                <Field label="Age" value={patient.age} />
                <Field label="Sex" value={patient.sex} />
                <Field label="Blood Type" value={patient.bloodType} />
                <Field label="Email" value={patient.email} />
                <Field label="Address" value={patient.address} />
                <Field label="Created" value={patient.createdAt && formatDateTime(patient.createdAt)} />
                <Field label="Last Visit" value={formatDate(patient.lastVisit)} />
              </div>
            </section>

            <section className="mk-patient-record__card mk-patient-history">
              <div className="mk-patient-history__title-row">
                <h3>Vitals history</h3>
                <span className="mk-patient-history__count">
                  {patient.visitHistory?.length || 0} {patient.visitHistory?.length === 1 ? 'record' : 'records'}
                </span>
              </div>
              {patient.visitHistory?.length === 0 && (
                <p className="mk-patient-history__empty">No kiosk check-ins found for this patient.</p>
              )}
              {patient.visitHistory?.map((visit, i) => (
                <div key={visit.id} className="mk-patient-history__card">
                  <div className="mk-patient-history__head">
                    <div>
                      <p className="mk-patient-history__number">
                        Check-in #{visit.recordNumber}
                        {i === 0 && <span className="mk-patient-history__latest">Latest</span>}
                      </p>
                      <p className="mk-patient-history__date">{formatDateTime(visit.timestamp)}</p>
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
            </section>
          </>
        )}
      </div>

      {editing && patient && (
        <PatientFormModal patient={patient} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      )}

      {showNewQr && patient?.qrToken && (
        <div className="mk-patients__modal-backdrop" onClick={closeNewQr}>
          <div
            className="mk-patients__modal mk-patients__modal--qr"
            role="dialog"
            aria-labelledby="mk-new-qr-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="mk-patients__modal-close" onClick={closeNewQr} aria-label="Close">
              ✕
            </button>
            <h2 id="mk-new-qr-title">Patient created</h2>
            <p className="mk-patients__modal-subtitle">
              Give this QR code to <strong>{fullName}</strong>. They can scan it at any Medi-Kiosk to sign in.
            </p>
            <PatientQrCode patient={patient} size={240} />
            <div className="mk-patients__form-actions">
              <Button onClick={closeNewQr}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {confirmingRegenerate && patient && (
        <div className="mk-patients__modal-backdrop" onClick={() => !regenerating && setConfirmingRegenerate(false)}>
          <div
            className="mk-patients__modal mk-patients__modal--confirm"
            role="alertdialog"
            aria-labelledby="mk-regen-qr-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mk-regen-qr-title">Generate a new QR code?</h2>
            <p className="mk-patients__confirm-text">
              {fullName}&apos;s current QR code will stop working right away, including any printed copies.
            </p>
            <div className="mk-patients__form-actions">
              <Button variant="secondary" disabled={regenerating} onClick={() => setConfirmingRegenerate(false)}>
                Cancel
              </Button>
              <Button disabled={regenerating} onClick={handleRegenerate}>
                {regenerating ? 'Generating…' : 'Generate new code'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && patient && (
        <div className="mk-patients__modal-backdrop" onClick={() => !deleting && setConfirmingDelete(false)}>
          <div
            className="mk-patients__modal mk-patients__modal--confirm"
            role="alertdialog"
            aria-labelledby="mk-delete-patient-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="mk-delete-patient-title">Delete patient?</h2>
            <p className="mk-patients__confirm-text">
              This permanently deletes <strong>{fullName}</strong> ({patient.id}) and all{' '}
              <strong>{patient.visitHistory?.length || 0}</strong> of their vitals / check-in records. This cannot be undone.
            </p>
            <div className="mk-patients__form-actions">
              <Button variant="secondary" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Deleting…' : 'Delete patient'}
              </Button>
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
