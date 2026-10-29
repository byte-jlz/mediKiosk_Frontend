import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { AdminHeader } from '../../components/Sidebar';
import { getRecords } from '../../services/triageService';
import { LiveIndicator, UrgencyBadge } from './StaffBits';
import { useLiveEvents, useStaffQueue } from './staffHooks';
import { fmtDateTime } from './triageFormat';
import './staff.css';

/**
 * Patient records (Clinic Staff): every check-in the clinic handled -
 * vitals, classification and timestamps. It is ONE shared list: every staff
 * account sees every record, whoever is logged in. "Handled by" only shows
 * who marked the patient as seen.
 */
export default function PatientRecordsLogScreen() {
  const navigate = useNavigate();
  const { live } = useStaffQueue();       // keeps the live connection + indicator
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getRecords(search)
      .then((r) => {
        setRows(r);
        setError('');
      })
      .catch((err) =>
        setError(err.status === 404
          ? 'The backend is out of date - restart it so it has the patient records page.'
          : err.message));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);   // small debounce while typing
    return () => clearTimeout(t);
  }, [load, search]);

  useLiveEvents(load);                    // new check-in / seen / acknowledged -> reload

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">Patient records</h1>
            <p className="mk-page__subtitle">
              Every patient who checked in at a kiosk. Click a record to see all the vitals,
              the classification details and the timestamps. All clinic staff see the same records.
            </p>
          </div>
          <LiveIndicator live={live} />
        </div>

        <div className="mk-records__bar">
          <input
            className="mk-records__search"
            type="search"
            placeholder="Search by name, patient ID or check-in ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patient records"
          />
          <span className="mk-staff-muted">
            {rows ? `${rows.length} record${rows.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        {error && <p className="mk-staff-error">{error}</p>}

        <div className="mk-queue__table-wrap">
          <table className="mk-queue__table mk-records__table">
            <thead>
              <tr>
                <th>Checked in</th>
                <th>Patient</th>
                <th>Classification</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {!rows && !error && (
                <tr><td colSpan={4} className="mk-queue__empty">Loading records…</td></tr>
              )}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="mk-queue__empty">
                    {search ? 'No records match that search.' : 'No check-ins recorded yet.'}
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <tr
                  key={r.id}
                  className={`mk-queue__row mk-queue__row--${r.urgencyLevel || 'unrated'}`}
                  onClick={() => navigate(`/admin/records/${r.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/records/${r.id}`)}
                >
                  <td>{fmtDateTime(r.createdAt)}</td>
                  <td>
                    <span className="mk-queue__name">{r.patientName}</span>
                    <span className="mk-queue__sub">{r.isGuest ? 'Guest' : r.patientId}</span>
                  </td>
                  <td><UrgencyBadge level={r.urgencyLevel} /></td>
                  <td className="mk-records__open">View details →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
