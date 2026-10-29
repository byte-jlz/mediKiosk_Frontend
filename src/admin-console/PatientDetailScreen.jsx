import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { UrgencyBadge } from './staff/StaffBits';
import Button from '../components/Button';
import PatientFormModal from './PatientFormModal';
import PatientQrCode from './PatientQrCode';
import {
  archivePatient,
  deletePatient,
  getPatientById,
  regenerateQrToken,
  restorePatient,
} from '../services/patientsService';
import { formatDate, formatDateTime, formatEpochDate } from './patientFormat';
import { fmtBp, fmtVital } from './staff/triageFormat';
import { fmtDateTimeSec } from './kioskFormat';
import './PatientRecordsScreen.css';

export default function PatientDetailScreen() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Set by the Patients screen right after "Add patient" so the new QR code pops up.
  const [showNewQr, setShowNewQr] = useState(Boolean(location.state?.justCreated));
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadPatient = useCallback(() => {
    getPatientById(patientId)
      .then((data) => {
        setPatient(data);
        setError('');
      })
      .catch((err) => {
        if (err.status === 404) setPatient(null);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    loadPatient();
  }, [loadPatient]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const { qrToken } = await regenerateQrToken(patient.id);
      setPatient((p) => ({ ...p, qrToken }));
    } catch (err) {
      setError(err.message);
    }
    setRegenerating(false);
    setConfirmingRegenerate(false);
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    try {
      const updated = patient.status === 'archived'
        ? await restorePatient(patient.id)
        : await archivePatient(patient.id);
      setPatient(updated);
    } catch (err) {
      setError(err.message);
    }
    setArchiving(false);
  }

  function closeNewQr() {
    setShowNewQr(false);
    // Drop the router state so a refresh doesn't reopen the pop-up.
    navigate(location.pathname, { replace: true, state: null });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePatient(patient.id);
      navigate('/admin/patients', { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const fullName = patient
    ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <Link to="/admin/patients" className="mk-patient-record__back">
          ← Back to patients
        </Link>

        {loading && <p className="mk-patient-history__loading">Loading patient record…</p>}
        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

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
                <Button variant="ghost" disabled={archiving} onClick={handleArchiveToggle}>
                  {patient.status === 'archived' ? '↺ Restore' : '🗄 Archive'}
                </Button>
                <Button variant="danger" onClick={() => setConfirmingDelete(true)}>🗑 Delete</Button>
              </div>
            </div>

            {patient.status === 'archived' && (
              <p className="mk-patient-record__archived" role="status">
                <StatusBadge status="Archived" /> This record is archived
                {patient.archivedAt ? ` since ${formatDateTime(patient.archivedAt)}` : ''}
                {patient.archivedBy ? ` by ${patient.archivedBy}` : ''}. The patient can&apos;t sign in at a kiosk
                until you restore it.
              </p>
            )}

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
                <Field label="Registered via" value={patient.registeredVia === 'app' ? 'Phone app sign-up' : 'Super Admin'} />
                <Field label="Last Visit" value={formatEpochDate(patient.lastVisit)} />
              </div>
            </section>

            <section className="mk-patient-record__card mk-patient-history">
              <div className="mk-patient-history__title-row">
                <h3>Patient history</h3>
                <span className="mk-patient-history__count">
                  {patient.history.length} {patient.history.length === 1 ? 'check-in' : 'check-ins'}
                </span>
              </div>
              {patient.history.length === 0 && (
                <p className="mk-patient-history__empty">No kiosk check-ins found for this patient.</p>
              )}
              {patient.history.map((visit, i) => (
                <div key={visit.id} className="mk-patient-history__card">
                  <div className="mk-patient-history__head">
                    <div>
                      <p className="mk-patient-history__number">
                        Check-in #{visit.recordNumber}
                        {i === 0 && <span className="mk-patient-history__latest">Latest</span>}
                      </p>
                      <p className="mk-patient-history__date">{fmtDateTimeSec(visit.createdAt)}</p>
                      <p className="mk-patient-history__kiosk">
                        {visit.kioskName} · {visit.id}
                        {visit.queueStatus === 'seen'
                          ? ` · seen ${fmtDateTimeSec(visit.seenAt)}${visit.seenBy ? ` by ${visit.seenBy}` : ''}`
                          : ' · waiting'}
                      </p>
                    </div>
                    <UrgencyBadge level={visit.urgencyLevel} />
                  </div>
                  <p className="mk-patient-history__summary">
                    {visit.incomplete
                      ? `Incomplete check-in – missing ${visit.missingVitals.length} step(s), risk check not run.`
                      : visit.urgencyReasons.join(' · ')}
                  </p>
                  <div className="mk-patient-history__metrics">
                    <Metric label="Temperature" value={fmtVital(visit.vitals.temperature, '°C', 1)} />
                    <Metric label="Blood pressure" value={visit.vitals.systolic ? `${fmtBp(visit.vitals)} mmHg` : '—'} />
                    <Metric label="Heart rate" value={fmtVital(visit.vitals.heartRate, 'bpm')} />
                    <Metric label="SpO₂" value={fmtVital(visit.vitals.spo2, '%')} />
                    <Metric label="Respiration" value={fmtVital(visit.vitals.respiration, '/min')} />
                    <Metric label="Weight" value={fmtVital(visit.vitals.weight, 'kg', 1)} />
                    <Metric label="Height" value={fmtVital(visit.vitals.height, 'cm', 1)} />
                    <Metric
                      label="BMI"
                      value={`${fmtVital(visit.vitals.bmi, '', 1)}${visit.bmiCategory ? ` · ${visit.bmiCategory}` : ''}`}
                    />
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      {editing && patient && (
        <PatientFormModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setPatient(saved);
            setEditing(false);
          }}
        />
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
              Use this for a data privacy request. It permanently deletes <strong>{fullName}</strong>{' '}
              ({patient.id}) and all <strong>{patient.history.length}</strong> of their check-in records.
              The audit trail keeps a note that the record was deleted. This cannot be undone. To only hide
              an old record, archive it instead.
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

function Metric({ label, value }) {
  return (
    <div className="mk-patient-history__metric">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
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
