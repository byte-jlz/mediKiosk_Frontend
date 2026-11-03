import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import PatientFormModal from './PatientFormModal';
import PatientQrCode from './PatientQrCode';
import { getPatientById, deletePatient, regenerateQrToken, getPatientQr, resetPatientMfa } from '../services/patientsService';
import { getPatientVisits } from '../services/clinicalService';
import { getCurrentStaff, staffPath } from '../services/authService';
import { formatDate, formatDateTime } from './patientFormat';
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
  const role = getCurrentStaff().accessRole;
  const isClinical = role === 'clinic_staff';
  const canDelete = role === 'super_admin'; // permanent deletion is a super admin decision
  const [visits, setVisits] = useState([]);
  const [qrToken, setQrToken] = useState(location.state?.qrToken || null);
  const [qrError, setQrError] = useState('');
  // Set by the Patients screen right after "Add patient" so the new QR code pops up.
  const [showNewQr, setShowNewQr] = useState(Boolean(location.state?.justCreated));
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  function loadPatient() {
    return getPatientById(patientId)
      .then((data) => {
        setPatient(data);
        if (data && isClinical) getPatientVisits(patientId).then(setVisits).catch((e) => setError(e.message));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleShowQr() {
    setQrError('');
    try {
      setQrToken(await getPatientQr(patientId));
    } catch (e) {
      setQrError(e.message);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      setQrToken(await regenerateQrToken(patient.id));
      setShowNewQr(true);
    } catch (e) {
      setQrError(e.message);
    }
    setRegenerating(false);
    setConfirmingRegenerate(false);
  }

  async function handleResetMfa() {
    if (!window.confirm(`Reset ${fullName}'s two-step sign-in? They are signed out of the app and can turn it on again themselves. Only do this after confirming it is really them.`)) return;
    try {
      await resetPatientMfa(patient.id);
      window.alert(`${fullName}'s two-step sign-in was reset.`);
    } catch (e) {
      setError(e.message);
    }
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
      navigate(staffPath('patients'), { replace: true });
    } catch (e) {
      setError(e.message);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const fullName = patient
    ? [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <AdminLayout>
      <AdminHeader title="Patient record" />
      <div className="mk-page">
        <Link to={staffPath('patients')} className="mk-patient-record__back">
          ← Back to patients
        </Link>

        {error && <p className="mk-patient-history__empty" role="alert">{error}</p>}

        {loading && <p className="mk-patient-history__loading">Loading patient record…</p>}

        {!loading && !patient && (
          <p className="mk-patient-history__empty">No patient found with ID {patientId}.</p>
        )}

        {!loading && patient && (
          <>
            <div className="mk-page__title-row mk-patient-record__header">
              <div className="mk-patient-record__identity">
                {qrToken ? (
                  <PatientQrCode patient={{ ...patient, qrToken }} size={120} compact />
                ) : (
                  <div className="mk-patient-qr__placeholder">
                    <span>QR code hidden</span>
                    <Button onClick={handleShowQr}>Show</Button>
                  </div>
                )}
                <div>
                  <h1 className="mk-page__title">{fullName}</h1>
                  <p className="mk-page__subtitle">{patient.id}</p>
                  <div className="mk-patient-qr__info">
                    <p>
                      The patient scans this permanent code at a Medi-Kiosk to sign in. Treat it like a password. Viewing it is
                      recorded in the audit log. If it is lost or shared, generate a new one — the old code stops working immediately.
                    </p>
                    {qrError && <p className="mk-patient-history__empty">{qrError}</p>}
                    <Button variant="ghost" onClick={() => setConfirmingRegenerate(true)}>
                      ↻ Generate new QR code
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mk-page__actions">
                <Button variant="secondary" onClick={() => setEditing(true)}>✎ Edit</Button>
                <Button variant="secondary" onClick={handleResetMfa}>Reset 2-step sign-in</Button>
                {canDelete && <Button variant="danger" onClick={() => setConfirmingDelete(true)}>🗑 Delete</Button>}
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
                  {isClinical ? visits.length : patient.visitCount || 0} {(isClinical ? visits.length : patient.visitCount) === 1 ? 'record' : 'records'}
                </span>
              </div>
              {!isClinical && (
                <p className="mk-patient-history__empty">
                  Vital signs and urgency results are visible to clinic staff only. Your role can see that {patient.visitCount || 0} check-in(s) exist.
                </p>
              )}
              {isClinical && visits.length === 0 && (
                <p className="mk-patient-history__empty">No kiosk check-ins found for this patient.</p>
              )}
              {visits.map((visit, i) => (
                <div key={visit.id} className="mk-patient-history__card">
                  <div className="mk-patient-history__head">
                    <div>
                      <p className="mk-patient-history__number">
                        Check-in {formatDateTime(visit.captured_at)}
                        {i === 0 && <span className="mk-patient-history__latest">Latest</span>}
                      </p>
                      <p className="mk-patient-history__kiosk">{visit.kiosk_id}</p>
                    </div>
                    <StatusBadge status={visit.tier} />
                  </div>
                  {visit.overridden && (
                    <p className="mk-patient-history__summary">Staff changed urgency from {visit.model_tier}: “{visit.override?.reason}”</p>
                  )}
                  <div className="mk-patient-history__metrics">
                    {[
                      ['Blood pressure', visit.vitals.systolic != null ? `${visit.vitals.systolic}/${visit.vitals.diastolic ?? '—'} mmHg` : '—'],
                      ['Heart rate', `${visit.vitals.heart_rate ?? '—'} bpm`],
                      ['SpO₂', `${visit.vitals.spo2 ?? '—'} %`],
                      ['Temperature', `${visit.vitals.temperature ?? '—'} °C`],
                      ['Respiration', `${visit.vitals.respiratory_rate ?? '—'} /min`],
                      ...(visit.body?.bmi != null ? [['BMI', `${visit.body.bmi}`]] : []),
                    ].map(([label, value]) => (
                      <div key={label} className="mk-patient-history__metric">
                        <strong>{label}</strong>
                        <span>{value}</span>
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
        <PatientFormModal patient={patient} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadPatient(); }} />
      )}

      {showNewQr && qrToken && (
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
            <h2 id="mk-new-qr-title">QR code ready</h2>
            <p className="mk-patients__modal-subtitle">
              Give this QR code to <strong>{fullName}</strong>. They can scan it at any Medi-Kiosk to sign in.
            </p>
            <PatientQrCode patient={{ ...patient, qrToken }} size={240} />
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
              <strong>{patient.visitCount || 0}</strong> of their vitals / check-in records. This cannot be undone.
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