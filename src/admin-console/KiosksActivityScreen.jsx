import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import { getKioskMonitor } from '../services/kiosksService';
import { connectionBadge, fmtAgo } from './kioskFormat';
import { vitalName } from './staff/triageFormat';
import './KiosksActivityScreen.css';

const REFRESH_MS = 5000;

/**
 * "Monitor kiosk activity" (Super Admin): is each kiosk online, is the MQTT
 * broker connected, what is each kiosk doing right now, and the activity feed.
 * Refreshes every 5 seconds.
 */
export default function KiosksActivityScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);

  const load = useCallback(() => {
    getKioskMonitor()
      .then((d) => {
        setData(d);
        setError('');
        setUpdated(Date.now());
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const broker = data?.broker?.connected;

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Monitor Kiosk Activity</p>
            <h1 className="mk-page__title">Kiosk activity</h1>
            <p className="mk-page__subtitle">
              Live status of every kiosk and the MQTT broker, and what the kiosks have been doing.
              Updates every 5 seconds.
            </p>
          </div>
          {updated && <span className="mk-kmon__updated">Updated {new Date(updated).toLocaleTimeString()}</span>}
        </div>

        {error && <p className="mk-kmon__error" role="alert">{error}</p>}

        {data && (
          <>
            <div className={`mk-kmon__broker${broker ? ' is-ok' : ' is-down'}`} role="status">
              <span className="mk-kmon__broker-dot" aria-hidden="true" />
              <div>
                <strong>MQTT broker: {broker ? 'connected' : 'NOT connected'}</strong>
                <span>
                  {broker
                    ? 'The backend is receiving kiosk results and status.'
                    : 'The backend cannot reach Mosquitto - no kiosk results will arrive. Check that the broker is running.'}
                </span>
              </div>
            </div>

            <div className="mk-kmon__grid">
              {data.kiosks.map((k) => (
                <div key={k.id} className={`mk-kmon__card mk-kmon__card--${k.connection}`}>
                  <div className="mk-kmon__card-top">
                    <div>
                      <p className="mk-kmon__name">{k.name}</p>
                      <p className="mk-kmon__meta">{k.id} · {k.clinic}</p>
                    </div>
                    <StatusBadge status={connectionBadge(k.connection)} />
                  </div>
                  <dl className="mk-kmon__facts">
                    <div><dt>Doing now</dt><dd>{k.currentScan ? `Measuring: ${vitalName(k.currentScan)}` : k.connection === 'online' ? 'Idle, ready' : '—'}</dd></div>
                    <div><dt>Last status update</dt><dd>{fmtAgo(k.lastSeen)}</dd></div>
                    <div><dt>Check-ins today</dt><dd>{k.checkInsToday}</dd></div>
                    <div><dt>Sensors</dt><dd>{k.simulated === true ? 'Simulated' : k.simulated === false ? 'Real' : '—'}</dd></div>
                    <div><dt>Agent version</dt><dd>{k.agentVersion || '—'}</dd></div>
                    <div><dt>Setting</dt><dd>{k.status}</dd></div>
                  </dl>
                </div>
              ))}
            </div>

            <h2 className="mk-kmon__h2">Activity feed</h2>
            <div className="mk-kactivity">
              {data.activity.length === 0 && (
                <p className="mk-kactivity__loading">No kiosk activity yet. Scans and connection changes show up here.</p>
              )}
              {data.activity.map((a, i) => (
                <div key={`${a.ts}-${i}`} className="mk-kactivity__row">
                  <div className="mk-kactivity__time">{a.time}</div>
                  <div className={`mk-kactivity__dot${/OFFLINE|failed/i.test(a.event) ? ' is-bad' : ''}`} />
                  <div className="mk-kactivity__body">
                    <p className="mk-kactivity__event">{a.event}</p>
                    <p className="mk-kactivity__kiosk">{a.kiosk}</p>
                  </div>
                  <div className="mk-kactivity__patient">
                    {a.patient && a.patient !== '—' ? `Patient ${a.patient}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
