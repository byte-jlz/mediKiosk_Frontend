import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { AdminHeader } from '../../components/Sidebar';
import Button from '../../components/Button';
import { acknowledgeAlert, getCheckIn, markSeen } from '../../services/triageService';
import { UrgencyBadge } from './StaffBits';
import { useLiveEvents, useNow } from './staffHooks';
import { fmtBp, fmtDateTime, fmtTime, fmtVital, vitalName, waitingFor } from './triageFormat';
import './staff.css';

function VitalCard({ label, value, note, warn }) {
  return (
    <div className={`mk-vcard${warn ? ' mk-vcard--warn' : ''}`}>
      <p className="mk-vcard__label">{label}</p>
      <p className="mk-vcard__value">{value}</p>
      {note && <p className="mk-vcard__note">{note}</p>}
    </div>
  );
}

/**
 * "View patient vital signs details" + «include» "View patients results/history".
 * Opening this page is recorded in the audit trail by the backend.
 */
export default function CheckInDetailScreen() {
  const { checkInId } = useParams();
  const navigate = useNavigate();
  const now = useNow();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getCheckIn(checkInId)
      .then((d) => {
        setC(d);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [checkInId]);

  useEffect(() => {
    setC(null);
    load();
  }, [load]);

  // someone else marked this patient seen / acknowledged -> show it
  const onEvent = useCallback((e) => {
    if (e.type === 'queue' && e.id === checkInId) load();
  }, [checkInId, load]);
  useLiveEvents(onEvent);

  async function act(fn) {
    setBusy(true);
    setError('');
    try {
      await fn(checkInId);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const r = c?.readings || {};
  const hr = c?.heartRateCheck;
  const waiting = c?.queueStatus === 'waiting';

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <Link to="/admin/queue" className="mk-back">← Patient queue</Link>

        {!c && !error && <p className="mk-staff-muted">Loading…</p>}
        {error && <p className="mk-staff-error">{error}</p>}

        {c && (
          <>
            <div className="mk-page__title-row">
              <div>
                <p className="mk-page__eyebrow">Vital signs · {c.id}</p>
                <h1 className="mk-page__title">{c.patientName}</h1>
                <p className="mk-page__subtitle">
                  {c.isGuest ? 'Guest' : `Patient ${c.patientId}`} · {c.kioskName} · checked in{' '}
                  {fmtDateTime(c.createdAt)}
                  {waiting ? ` · waiting ${waitingFor(c.createdAt, now)}` : ''}
                  {c.simulated ? ' · simulated readings' : ''}
                </p>
              </div>
              <div className="mk-page__actions">
                {c.alert && !c.alertAcknowledged && (
                  <Button variant="secondary" disabled={busy} onClick={() => act(acknowledgeAlert)}>
                    Acknowledge alert
                  </Button>
                )}
                {waiting ? (
                  <Button disabled={busy} onClick={() => act(markSeen)}>Mark as seen</Button>
                ) : (
                  <span className="mk-staff-muted">
                    Seen {fmtTime(c.seenAt)}{c.seenBy ? ` by ${c.seenBy}` : ''}
                  </span>
                )}
              </div>
            </div>

            <section className={`mk-urgbox mk-urgbox--${c.urgencyLevel || 'unrated'}`}>
              <UrgencyBadge level={c.urgencyLevel} size="lg" />
              {c.incomplete ? (
                <div>
                  <p className="mk-urgbox__head">
                    Incomplete check-in – the risk check did not run. Please assess this patient.
                  </p>
                  <ul>
                    {c.missingVitals.map((v) => (
                      <li key={v}>
                        Missing: {vitalName(v)}
                        {c.failures?.[v] ? ` (${c.failures[v]})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="mk-urgbox__head">Why</p>
                  <ul>
                    {(c.urgency?.reasons || []).map((why) => <li key={why}>{why}</li>)}
                  </ul>
                  {c.urgency?.model && <p className="mk-urgbox__model">Checked by: {c.urgency.model}</p>}
                </div>
              )}
              {c.alert && (
                <p className="mk-urgbox__ack">
                  {c.alertAcknowledged ? 'Alert acknowledged' : 'Alert not acknowledged yet'}
                </p>
              )}
            </section>

            <h2 className="mk-staff-h2">Vital signs</h2>
            <div className="mk-vgrid">
              <VitalCard label="Temperature" value={fmtVital(r.temperature?.value, '°C', 1)} />
              <VitalCard
                label="Blood pressure"
                value={r.bloodPressure ? `${fmtBp(r.bloodPressure)} mmHg` : '—'}
              />
              <VitalCard
                label="Heart rate"
                value={fmtVital(r.heartRate?.value, 'bpm')}
                warn={hr?.mismatch}
                note={
                  hr?.mismatch
                    ? `Devices disagree: BP monitor ${hr.bpMonitor}, finger sensor ${hr.fingerSensor} bpm`
                    : r.heartRate?.source === 'finger_sensor'
                      ? 'From the finger sensor (no BP reading)'
                      : 'From the BP monitor'
                }
              />
              <VitalCard label="SpO₂ (blood oxygen)" value={fmtVital(r.spo2?.value, '%')} />
              <VitalCard label="Respiration" value={fmtVital(r.respiration?.value, 'breaths/min')} />
              <VitalCard
                label="Weight · Height"
                value={`${fmtVital(r.weight?.value, 'kg', 1)} · ${fmtVital(r.height?.value, 'cm', 1)}`}
              />
              <VitalCard
                label="BMI"
                value={fmtVital(r.bmi?.value, '', 1)}
                note={c.bmiCategory ? `${c.bmiCategory.label} (${c.bmiCategory.standardName})` : null}
              />
            </div>

            <h2 className="mk-staff-h2">Results history</h2>
            {c.isGuest ? (
              <p className="mk-staff-muted">Guests have no saved history.</p>
            ) : (
              <div className="mk-queue__table-wrap">
                <table className="mk-queue__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Urgency</th>
                      <th>BP</th>
                      <th>SpO₂</th>
                      <th>Temp</th>
                      <th>Heart rate</th>
                      <th>Resp.</th>
                      <th>Weight</th>
                      <th>BMI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.history.map((h) => (
                      <tr
                        key={h.id}
                        className={`mk-queue__row${h.id === c.id ? ' is-current' : ''}`}
                        onClick={() => h.id !== c.id && navigate(`/admin/queue/${h.id}`)}
                      >
                        <td>
                          {fmtDateTime(h.createdAt)}
                          {h.id === c.id && <span className="mk-queue__sub">this check-in</span>}
                        </td>
                        <td><UrgencyBadge level={h.urgencyLevel} /></td>
                        <td>{fmtBp(h.vitals)}</td>
                        <td>{fmtVital(h.vitals.spo2, '%')}</td>
                        <td>{fmtVital(h.vitals.temperature, '°C', 1)}</td>
                        <td>{fmtVital(h.vitals.heartRate, 'bpm')}</td>
                        <td>{fmtVital(h.vitals.respiration)}</td>
                        <td>{fmtVital(h.vitals.weight, 'kg', 1)}</td>
                        <td>{fmtVital(h.vitals.bmi, '', 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
