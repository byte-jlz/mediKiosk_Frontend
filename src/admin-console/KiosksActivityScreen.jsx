import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import { getKioskActivity, getKiosks } from '../services/kiosksService';
import { getCurrentStaff } from '../services/authService';
import './KiosksActivityScreen.css';

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toKey(d); };

// "Today", "Yesterday", otherwise "Mon, Nov 2"
function dayLabel(key) {
  if (key === daysAgo(0)) return 'Today';
  if (key === daysAgo(1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function KiosksActivityScreen() {
  const [activity, setActivity] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [day, setDay] = useState('');      // '' = all recent days
  const [kiosk, setKiosk] = useState('');
  const [clinic, setClinic] = useState('');
  const canFilterClinic = ['admin', 'super_admin'].includes(getCurrentStaff()?.accessRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { getKiosks().then(setKiosks).catch(() => {}); }, []);

  useEffect(() => {
    let live = true;
    const load = () => getKioskActivity({ day, kiosk, clinic })
      .then((rows) => { if (live) { setActivity(rows); setError(''); } })
      .catch((e) => { if (live) setError(e.message || 'Could not load activity.'); })
      .finally(() => { if (live) setLoading(false); });
    setLoading(true);
    load();
    const timer = setInterval(load, 20000);
    return () => { live = false; clearInterval(timer); };
  }, [day, kiosk, clinic]);

  // newest day first; the server already sorts newest first, so keep that order within each day
  const groups = useMemo(() => {
    const map = new Map();
    activity.forEach((a) => { if (!map.has(a.date)) map.set(a.date, []); map.get(a.date).push(a); });
    return [...map.entries()];
  }, [activity]);

  const clinics = useMemo(() => [...new Set(kiosks.map((k) => k.clinic).filter(Boolean))].sort(), [kiosks]);
  const kioskChoices = clinic ? kiosks.filter((k) => k.clinic === clinic) : kiosks;

  const quick = [
    { label: 'All days', value: '' },
    { label: 'Today', value: daysAgo(0) },
    { label: 'Yesterday', value: daysAgo(1) },
  ];

  return (
    <AdminLayout>
      <AdminHeader title="Kiosks activity" />
      <div className="mk-page">
        <div className="mk-kfilters">
          <div className="mk-kfilters__chips" role="group" aria-label="Day">
            {quick.map((q) => (
              <button key={q.label} type="button" className={`mk-kfilters__chip${day === q.value ? ' is-on' : ''}`} onClick={() => setDay(q.value)}>
                {q.label}
              </button>
            ))}
          </div>
          <label className="mk-kfilters__field">
            <span>Pick a date</span>
            <input type="date" value={day} max={daysAgo(0)} onChange={(e) => setDay(e.target.value)} />
          </label>
          {canFilterClinic && (
            <label className="mk-kfilters__field">
              <span>Clinic</span>
              <select value={clinic} onChange={(e) => { setClinic(e.target.value); setKiosk(''); }}>
                <option value="">All clinics</option>
                {clinics.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label className="mk-kfilters__field">
            <span>Kiosk</span>
            <select value={kiosk} onChange={(e) => setKiosk(e.target.value)}>
              <option value="">All kiosks</option>
              {kioskChoices.map((k) => <option key={k.id} value={k.id}>{k.name || k.id}</option>)}
            </select>
          </label>
          <p className="mk-kfilters__count">{activity.length} check-in{activity.length === 1 ? '' : 's'}{day ? ` on ${dayLabel(day)}` : ''}</p>
        </div>

        {error && <p className="mk-queue__error" role="alert">{error}</p>}

        <div className="mk-kactivity">
          {loading && <p className="mk-kactivity__loading">Loading activity…</p>}
          {!loading && !error && activity.length === 0 && (
            <p className="mk-kactivity__loading">{day ? `No check-ins on ${dayLabel(day)}.` : 'No recent kiosk activity.'}</p>
          )}
          {groups.map(([date, rows]) => (
            <section key={date} className="mk-kday">
              <h2 className="mk-kday__head">
                <span>{dayLabel(date)}</span>
                <b>{rows.length}</b>
              </h2>
              {rows.map((a, i) => (
                <div key={`${date}-${i}`} className="mk-kactivity__row">
                  <div className="mk-kactivity__time">{a.time}</div>
                  <div className="mk-kactivity__dot" />
                  <div className="mk-kactivity__body">
                    <p className="mk-kactivity__event">{a.event}</p>
                    <p className="mk-kactivity__kiosk">{a.kiosk}{a.clinic ? ` · ${a.clinic}` : ''}</p>
                  </div>
                  <div className="mk-kactivity__patient">{a.patient}</div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
