import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import { getKioskActivity } from '../services/auditService';
import './KiosksActivityScreen.css';

export default function KiosksActivityScreen() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = () => {
      getKioskActivity().then((data) => {
        setActivity(data);
        setLoading(false);
      });
    };

    loadActivity();
    window.addEventListener('mk-admin-store-updated', loadActivity);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadActivity);
    };
  }, []);

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Live Kiosk Feed</p>
            <h1 className="mk-page__title">Kiosks Activity</h1>
            <p className="mk-page__subtitle">
              Real-time check-in and status events across every kiosk in the network.
            </p>
          </div>
        </div>

        <div className="mk-kactivity">
          {loading && <p className="mk-kactivity__loading">Loading activity…</p>}
          {!loading && activity.length === 0 && (
            <p className="mk-kactivity__loading">No recent kiosk activity.</p>
          )}
          {activity.map((a, i) => (
            <div key={i} className="mk-kactivity__row">
              <div className="mk-kactivity__time">{a.time}</div>
              <div className="mk-kactivity__dot" />
              <div className="mk-kactivity__body">
                <p className="mk-kactivity__event">{a.event}</p>
                <p className="mk-kactivity__kiosk">{a.kiosk}</p>
              </div>
              <div className="mk-kactivity__patient">
                {a.patient !== '—' ? `Patient ${a.patient}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
