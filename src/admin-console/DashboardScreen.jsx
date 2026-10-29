import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getCurrentStaff } from '../services/authService';
import { getDashboardStats } from '../services/kiosksService';
import { connectionBadge, fmtAgo } from './kioskFormat';
import './DashboardScreen.css';

/** Super Admin overview: real counts, kiosk health and the latest audit events. */
export default function DashboardScreen() {
  const navigate = useNavigate();
  const me = getCurrentStaff();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getDashboardStats().then((s) => {
      setStats(s);
      setError('');
    }).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const cards = stats
    ? [
        { label: 'Staff accounts', value: stats.staffAccounts, delta: `${stats.staffActive} active · ${stats.clinicStaff} clinic staff`, color: '#4a7ba9', to: '/admin/staff' },
        { label: 'Patient records', value: stats.patientRecords, delta: `${stats.patientsArchived} archived`, color: '#2f9e5c', to: '/admin/patients' },
        { label: 'Kiosks online', value: `${stats.kiosksOnline}/${stats.kiosksTotal}`, delta: `${stats.kiosksActive} active (not deactivated)`, color: '#3f7bc4', to: '/admin/kiosks-activity' },
        { label: 'Check-ins today', value: stats.checkInsToday, delta: `${stats.checkInsTotal} in total`, color: '#d99a2b', to: '/admin/reports' },
      ]
    : [];

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">Welcome{me.name ? `, ${me.name}` : ''}</h1>
            <p className="mk-page__subtitle">An overview of staff, patient records and kiosks.</p>
          </div>
          <div className="mk-page__actions">
            <Button variant="ghost" onClick={() => navigate('/admin/reports')}>View reports</Button>
          </div>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

        <div className="mk-dash__stats">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              className="mk-dash__stat-card mk-dash__stat-card--link"
              style={{ '--stat-color': card.color }}
              onClick={() => navigate(card.to)}
            >
              <p className="mk-dash__stat-label">{card.label.toUpperCase()}</p>
              <p className="mk-dash__stat-value">{card.value}</p>
              <p className="mk-dash__stat-delta">{card.delta}</p>
            </button>
          ))}
        </div>

        {stats && (
          <div className="mk-dash__grid">
            <div className="mk-dash__panel">
              <h2>Kiosk health</h2>
              <div className="mk-dash__kiosk-list">
                {stats.kiosks.map((k) => (
                  <div key={k.id} className="mk-dash__kiosk-row">
                    <div>
                      <p className="mk-dash__kiosk-name">{k.name}</p>
                      <p className="mk-dash__kiosk-meta">
                        {k.id} · {k.status === 'Deactivated' ? 'deactivated' : `last status ${fmtAgo(k.lastSeen)}`} · {k.checkInsToday} today
                      </p>
                    </div>
                    <StatusBadge status={k.status === 'Deactivated' ? 'Deactivated' : connectionBadge(k.connection)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mk-dash__panel">
              <h2>Recent activity</h2>
              <div className="mk-dash__activity-list">
                {stats.recentActivity.length === 0 && <p className="mk-dash__kiosk-meta">Nothing yet.</p>}
                {stats.recentActivity.map((a) => (
                  <div key={a.id} className="mk-dash__activity-row">
                    <span className="mk-dash__activity-check">✓</span>
                    <div className="mk-dash__activity-text">
                      <p className="mk-dash__activity-label">{a.action} · {a.target}</p>
                      <p className="mk-dash__activity-meta">{a.timestamp} · {a.actor}</p>
                    </div>
                    <StatusBadge status={a.severity} />
                  </div>
                ))}
              </div>
              <div className="mk-dash__panel-footer">
                <Button variant="ghost" onClick={() => navigate('/admin/audit-logs')}>Open audit trail</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
