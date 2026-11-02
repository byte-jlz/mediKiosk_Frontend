import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { AdminHeader } from '../../components/Sidebar';
import { markSeen } from '../../services/triageService';
import { LiveIndicator, UrgencyBadge } from './StaffBits';
import { useNow, useStaffQueue } from './staffHooks';
import { URGENCY_LEVELS, fmtBp, fmtTime, fmtVital, waitingFor } from './triageFormat';
import './staff.css';

/**
 * "View Prioritized Patient queue" + «include» "Filtered by urgency level".
 * The backend orders the queue (High -> Medium -> Not rated -> Normal, longest
 * wait first); the chips show one urgency level at a time.
 */
export default function PatientQueueScreen() {
  const navigate = useNavigate();
  const { data, error, live } = useStaffQueue();
  const now = useNow();
  const [level, setLevel] = useState('all');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');

  const queue = data?.queue || [];
  const counts = data?.counts || {};
  const rows = level === 'all' ? queue : queue.filter((r) => (r.urgencyLevel ?? null) === level);

  async function handleSeen(e, row) {
    e.stopPropagation();
    setBusy(row.id);
    setActionError('');
    try {
      await markSeen(row.id);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">Patient queue</h1>
            <p className="mk-page__subtitle">
              Patients waiting after their kiosk check-in, most urgent first. Mark a patient as
              seen when they are called in.
            </p>
          </div>
          <LiveIndicator live={live} />
        </div>

        <div className="mk-queue__chips" role="tablist" aria-label="Filter by urgency level">
          <button
            type="button"
            role="tab"
            aria-selected={level === 'all'}
            className={`mk-chip${level === 'all' ? ' is-on' : ''}`}
            onClick={() => setLevel('all')}
          >
            All waiting <span className="mk-chip__n">{counts.waiting ?? 0}</span>
          </button>
          {URGENCY_LEVELS.map((l) => (
            <button
              key={l.label}
              type="button"
              role="tab"
              aria-selected={level === l.key}
              className={`mk-chip mk-chip--${l.key || 'unrated'}${level === l.key ? ' is-on' : ''}`}
              onClick={() => setLevel(l.key)}
            >
              {l.label} <span className="mk-chip__n">{counts[l.countKey] ?? 0}</span>
            </button>
          ))}
        </div>

        {(error || actionError) && <p className="mk-staff-error">{actionError || error}</p>}

        <div className="mk-queue__table-wrap">
          <table className="mk-queue__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Urgency</th>
                <th>BP</th>
                <th>SpO₂</th>
                <th>Temp</th>
                <th>Heart rate</th>
                <th>Checked in</th>
                <th>Waiting</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {!data && !error && (
                <tr><td colSpan={10} className="mk-queue__empty">Loading the queue…</td></tr>
              )}
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="mk-queue__empty">
                    {level === 'all' ? 'Nobody is waiting right now.' : 'No patients at this urgency level.'}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`mk-queue__row mk-queue__row--${r.urgencyLevel || 'unrated'}`}
                  onClick={() => navigate(`/admin/queue/${r.id}`)}
                >
                  <td className="mk-queue__pos">{r.position}</td>
                  <td>
                    <span className="mk-queue__name">{r.patientName}</span>
                    <span className="mk-queue__sub">
                      {r.isGuest ? 'Guest' : r.patientId} · {r.kioskName}
                      {r.simulated ? ' · simulated' : ''}
                    </span>
                  </td>
                  <td>
                    <UrgencyBadge level={r.urgencyLevel} />
                    <span className="mk-queue__why">
                      {r.incomplete
                        ? `Incomplete – missing ${r.missingVitals.length} step${r.missingVitals.length === 1 ? '' : 's'}`
                        : r.urgencyReasons[0]}
                    </span>
                  </td>
                  <td>{fmtBp(r.vitals)}</td>
                  <td>{fmtVital(r.vitals.spo2, '%')}</td>
                  <td>{fmtVital(r.vitals.temperature, '°C', 1)}</td>
                  <td>{fmtVital(r.vitals.heartRate, 'bpm')}</td>
                  <td>{fmtTime(r.createdAt)}</td>
                  <td>{waitingFor(r.createdAt, now)}</td>
                  <td className="mk-queue__actions">
                    <button
                      type="button"
                      className="mk-queue__seen"
                      disabled={busy === r.id}
                      onClick={(e) => handleSeen(e, r)}
                    >
                      {busy === r.id ? 'Saving…' : 'Mark seen'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
