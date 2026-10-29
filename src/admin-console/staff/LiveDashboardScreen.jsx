import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { AdminHeader } from '../../components/Sidebar';
import { getCurrentStaff } from '../../services/authService';
import { LiveIndicator, UrgencyBadge } from './StaffBits';
import { useLiveEvents, useNow, useStaffQueue } from './staffHooks';
import { fmtTime, urgencyLabel, waitingFor } from './triageFormat';
import './staff.css';

const TILES = [
  { key: 'waiting', label: 'Waiting now', tone: 'navy' },
  { key: 'high', label: 'High Risk', tone: 'high' },
  { key: 'medium', label: 'Medium Risk', tone: 'medium' },
  { key: 'notRated', label: 'Not rated (incomplete)', tone: 'unrated' },
  { key: 'normal', label: 'Normal', tone: 'normal' },
  { key: 'seenToday', label: 'Seen today', tone: 'navy' },
];

function describe(event) {
  if (event.type === 'checkin') {
    const c = event.checkIn || {};
    return { text: `${c.patientName || 'A patient'} checked in`, level: event.urgencyLevel, sub: c.kioskName };
  }
  if (event.type === 'queue' && event.acknowledged) {
    return { text: `Alert for ${event.patientName} acknowledged`, sub: event.by ? `by ${event.by}` : '' };
  }
  if (event.type === 'queue' && event.queueStatus === 'seen') {
    return { text: `${event.patientName} was called in`, sub: event.by ? `by ${event.by}` : '' };
  }
  return null;
}

/**
 * "Monitor real-time dashboard" (Clinic Staff). Everything on this page
 * updates by itself over the live connection - no refresh needed.
 */
export default function LiveDashboardScreen() {
  const navigate = useNavigate();
  const staff = getCurrentStaff();
  const { data, error, live } = useStaffQueue();
  const now = useNow();
  const [feed, setFeed] = useState([]);

  const onEvent = useCallback((event) => {
    const d = describe(event);
    if (d) setFeed((f) => [{ ...d, ts: event.ts, key: `${event.ts}-${event.type}-${event.id}` }, ...f].slice(0, 30));
  }, []);
  useLiveEvents(onEvent);

  const counts = data?.counts || {};
  const next = (data?.queue || []).slice(0, 5);
  const alerts = data?.alerts || [];

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">Live dashboard</h1>
            <p className="mk-page__subtitle">
              Good day{staff.name ? `, ${staff.name}` : ''}. This page updates by itself as patients
              finish their kiosk check-in.
            </p>
          </div>
          <LiveIndicator live={live} />
        </div>

        {error && <p className="mk-staff-error">{error}</p>}

        <div className="mk-live-tiles">
          {TILES.map((t) => (
            <div key={t.key} className={`mk-live-tile mk-live-tile--${t.tone}`}>
              <p className="mk-live-tile__label">{t.label}</p>
              <p className="mk-live-tile__value">{data ? counts[t.key] ?? 0 : '–'}</p>
            </div>
          ))}
        </div>

        <div className="mk-live-grid">
          <section className="mk-live-panel mk-live-panel--wide">
            <div className="mk-live-panel__head">
              <h2>Next in the queue</h2>
              <Link to="/admin/queue">Open full queue →</Link>
            </div>
            {data && next.length === 0 && <p className="mk-staff-muted">Nobody is waiting right now.</p>}
            <ol className="mk-next">
              {next.map((r) => (
                <li key={r.id}>
                  <button type="button" className="mk-next__row" onClick={() => navigate(`/admin/queue/${r.id}`)}>
                    <span className="mk-next__pos">{r.position}</span>
                    <span className="mk-next__who">
                      <strong>{r.patientName}</strong>
                      <span>{r.incomplete ? 'Incomplete check-in' : r.urgencyReasons[0]}</span>
                    </span>
                    <UrgencyBadge level={r.urgencyLevel} />
                    <span className="mk-next__wait">waiting {waitingFor(r.createdAt, now)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="mk-live-panel">
            <div className="mk-live-panel__head">
              <h2>Open priority alerts</h2>
            </div>
            {data && alerts.length === 0 && <p className="mk-staff-muted">No open High Risk alerts.</p>}
            {alerts.map((a) => (
              <button key={a.id} type="button" className="mk-live-alert" onClick={() => navigate(`/admin/queue/${a.id}`)}>
                <strong>{a.patientName}</strong>
                <span>{a.urgencyReasons[0]}</span>
                <span className="mk-live-alert__meta">{a.kioskName} · {fmtTime(a.createdAt)}</span>
              </button>
            ))}
          </section>

          <section className="mk-live-panel">
            <div className="mk-live-panel__head">
              <h2>Live activity</h2>
            </div>
            {feed.length === 0 && (
              <p className="mk-staff-muted">New check-ins and queue changes will appear here as they happen.</p>
            )}
            <ul className="mk-feed">
              {feed.map((f) => (
                <li key={f.key}>
                  <span className="mk-feed__time">{fmtTime(f.ts)}</span>
                  <span className="mk-feed__text">
                    {f.text}
                    {f.level !== undefined && <> · <em>{urgencyLabel(f.level)}</em></>}
                    {f.sub && <span className="mk-feed__sub">{f.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
