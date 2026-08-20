import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getStaff } from '../services/staffService';
import { getDashboardStats, getKiosks } from '../services/kiosksService';
import { getRecentActivity } from '../services/auditService';
import './DashboardScreen.css';

export default function DashboardScreen() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [staffCount, setStaffCount] = useState(0);
  const [kiosks, setKiosks] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const loadData = () => {
      getDashboardStats().then(setStats);
      getKiosks().then(setKiosks);
      getRecentActivity().then(setActivity);
      getStaff().then((staffList) => setStaffCount(staffList.length));
    };

    loadData();
    window.addEventListener('mk-admin-store-updated', loadData);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadData);
    };
  }, []);

  const statCards = stats
    ? [
        { label: 'Staff Accounts', value: staffCount.toLocaleString(), delta: 'View registered staff', color: '#4a7ba9' },
        { label: 'Patient Records', value: stats.patientRecords.toLocaleString(), delta: stats.patientRecordsDelta, color: '#2f9e5c' },
        { label: 'Kiosks Online', value: `${stats.kiosksOnline}/${stats.kiosksTotal}`, delta: stats.kiosksAcross, color: '#3f7bc4' },
        { label: 'Check-ins Today', value: stats.checkInsToday, delta: stats.checkInsDelta, color: '#d99a2b' },
      ]
    : [];

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">Welcome, Admin</h1>
            <p className="mk-page__subtitle">
              Real-time kiosk and patient record monitoring across your clinic network.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button variant="ghost">View Reports</Button>
          </div>
        </div>

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
            <h2>Staff Accounts</h2>
            <p className="mk-dash__panel-text">Review the current staff registered in Medi Kiosk and open each profile.</p>
            <div className="mk-dash__panel-footer">
              <Button onClick={() => navigate('/admin/staff')}>View staff accounts</Button>
            </div>
          </div>

          <div className="mk-dash__panel">
            <h2>Kiosks Health</h2>
            <div className="mk-dash__kiosk-list">
              {kiosks.map((k) => (
                <div key={k.id} className="mk-dash__kiosk-row">
                  <div>
                    <p className="mk-dash__kiosk-name">{k.name}</p>
                    <p className="mk-dash__kiosk-meta">{k.id} · uptime {k.uptime}</p>
                  </div>
                  <StatusBadge status={k.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="mk-dash__panel">
            <h2>Recent Activity</h2>
            <div className="mk-dash__activity-list">
              {activity.map((a, i) => (
                <div key={i} className="mk-dash__activity-row">
                  <span className="mk-dash__activity-check">✓</span>
                  <div className="mk-dash__activity-text">
                    <p className="mk-dash__activity-label">{a.label}</p>
                    <p className="mk-dash__activity-meta">{a.meta}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
