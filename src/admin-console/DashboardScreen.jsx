import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getCurrentStaff, staffPath } from '../services/authService';
import { getKiosks } from '../services/kiosksService';
import { getDashboardStats, getRecentActivity } from '../services/overviewService';
import './DashboardScreen.css';

export default function DashboardScreen() {
  const navigate = useNavigate();
  const staff = getCurrentStaff();
  const isManager = staff.accessRole !== 'clinic_staff';
  const [stats, setStats] = useState(null);
  const [kiosks, setKiosks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fail = (e) => setError(e.message);
    getDashboardStats().then(setStats).catch(fail);
    getKiosks().then(setKiosks).catch(fail);
    if (isManager) getRecentActivity().then(setActivity).catch(fail);
  }, [isManager]);

  const statCards = stats
    ? [
        { label: 'Clinic Staff Accounts', value: stats.clinicalStaff.toLocaleString(), delta: stats.clinicalStaffDelta, color: 'var(--teal)' },
        { label: 'Patient Records', value: stats.patientRecords.toLocaleString(), delta: stats.patientRecordsDelta, color: 'var(--tier-normal)' },
        { label: 'Kiosks Online', value: `${stats.kiosksOnline}/${stats.kiosksTotal}`, delta: stats.kiosksAcross, color: 'var(--tier-low)' },
        { label: 'Check-ins Today', value: stats.checkInsToday, delta: stats.checkInsDelta, color: 'var(--tier-medium)' },
      ]
    : [];

  const firstName = staff.name?.split(' ')[0];

  return (
    <AdminLayout>
      <AdminHeader title={`Welcome, ${firstName}`} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__subtitle">Kiosk and patient record overview across your clinic network.</p>
          </div>
        </div>
        {error && <p className="mk-alogin__error">{error}</p>}

        <div className="mk-dash__stats">
          {statCards.map((card) => (
            <div key={card.label} className="mk-dash__stat-card" style={{ '--stat-color': card.color }}>
              <p className="mk-dash__stat-label">{card.label.toUpperCase()}</p>
              <p className="mk-dash__stat-value">{card.value}</p>
              <p className="mk-dash__stat-delta">{card.delta}</p>
            </div>
          ))}
        </div>

        <div className="mk-dash__grid">
          <div className="mk-dash__panel">
            <h2>{isManager ? 'Staff Accounts' : 'Patient queue'}</h2>
            <p className="mk-dash__panel-text">
              {isManager
                ? 'Create accounts, reset passwords and suspend access.'
                : 'See who is waiting, ordered by urgency and arrival time.'}
            </p>
            <div className="mk-dash__panel-footer">
              <Button onClick={() => navigate(staffPath(isManager ? 'staff' : 'queue'))}>
                {isManager ? 'View staff accounts' : 'Open queue'}
              </Button>
            </div>
          </div>

          <div className="mk-dash__panel">
            <h2>Kiosks Health</h2>
            <div className="mk-dash__kiosk-list">
              {kiosks.length === 0 && <p className="mk-dash__panel-text">No kiosks registered yet.</p>}
              {kiosks.map((k) => (
                <div key={k.id} className="mk-dash__kiosk-row">
                  <div>
                    <p className="mk-dash__kiosk-name">{k.name}</p>
                    <p className="mk-dash__kiosk-meta">{k.id} · {k.today} check-ins today</p>
                  </div>
                  <StatusBadge status={k.status} />
                </div>
              ))}
            </div>
          </div>

          {isManager && (
            <div className="mk-dash__panel">
              <h2>Recent Activity</h2>
              <div className="mk-dash__activity-list">
                {activity.length === 0 && <p className="mk-dash__panel-text">Nothing yet.</p>}
                {activity.map((a, i) => (
                  <div key={i} className="mk-dash__activity-row">
                    <span className="mk-dash__activity-check">✓</span>
                    <div className="mk-dash__activity-text">
                      <p className="mk-dash__activity-label">{a.label}</p>
                      <p className="mk-dash__activity-meta">{a.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}