import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { downloadReportCsv, getReportSummary } from '../services/reportsService';
import { UrgencyBadge } from './staff/StaffBits';
import { connectionBadge, fmtDateTimeSec } from './kioskFormat';
import './ReportsScreen.css';

const dash = (v, unit = '') => (v === null || v === undefined ? '—' : `${v}${unit}`);

function Tile({ label, value, note }) {
  return (
    <div className="mk-rep__tile">
      <p className="mk-rep__tile-label">{label}</p>
      <p className="mk-rep__tile-value">{value}</p>
      {note && <p className="mk-rep__tile-note">{note}</p>}
    </div>
  );
}

/**
 * "Generate reports" «extend» "export report" (Super Admin).
 * From the paper: triage data, patient volume and kiosk usage statistics.
 * All-time figures - no filters or charts yet.
 */
export default function ReportsScreen() {
  const [rep, setRep] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const generate = useCallback(() => {
    setError('');
    getReportSummary().then(setRep).catch((err) => setError(err.message));
  }, []);

  useEffect(generate, [generate]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadReportCsv();
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const t = rep?.triage;
  const v = rep?.patientVolume;

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page mk-rep">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Generate Reports</p>
            <h1 className="mk-page__title">Reports</h1>
            <p className="mk-page__subtitle">
              Triage data, patient volume and kiosk usage for every check-in recorded so far.
            </p>
            {rep && (
              <p className="mk-rep__meta">
                Generated {fmtDateTimeSec(rep.generatedAt)} by {rep.generatedBy}
                {rep.period.from ? ` · covers ${fmtDateTimeSec(rep.period.from)} – ${fmtDateTimeSec(rep.period.to)}` : ''}
              </p>
            )}
          </div>
          <div className="mk-page__actions mk-rep__actions">
            <Button variant="ghost" onClick={generate}>↻ Regenerate</Button>
            <Button variant="ghost" onClick={() => window.print()} disabled={!rep}>🖨 Print / PDF</Button>
            <Button onClick={handleExport} disabled={!rep || exporting}>
              {exporting ? 'Exporting…' : '⬇ Export CSV'}
            </Button>
          </div>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}
        {!rep && !error && <p className="mk-rep__muted">Generating report…</p>}

        {rep && (
          <>
            {/* ---------------- triage data ---------------- */}
            <section className="mk-rep__section">
              <h2>Triage data</h2>
              <div className="mk-rep__tiles">
                <Tile label="Seen by staff" value={t.seen} note={`${t.stillWaiting} still waiting`} />
                <Tile label="Avg wait to be seen" value={dash(t.avgWaitMinutes, ' min')} />
                <Tile label="High Risk alerts" value={t.highRiskAlerts} note={`${t.alertsAcknowledged} acknowledged`} />
                <Tile label="Avg time to acknowledge" value={dash(t.avgMinutesToAcknowledge, ' min')} />
                <Tile label="Incomplete check-ins" value={t.incompleteCheckIns} note="risk check not run" />
              </div>
              <table className="mk-rep__table">
                <thead>
                  <tr><th>Classification</th><th>Check-ins</th><th>Share</th><th>Avg wait to be seen</th></tr>
                </thead>
                <tbody>
                  {t.byLevel.map((row) => (
                    <tr key={row.level}>
                      <td><UrgencyBadge level={row.level === 'not_rated' ? null : row.level} /></td>
                      <td>{row.checkIns}</td>
                      <td>{row.share}%</td>
                      <td>{dash(row.avgWaitMinutes, ' min')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ---------------- patient volume ---------------- */}
            <section className="mk-rep__section">
              <h2>Patient volume</h2>
              <div className="mk-rep__tiles">
                <Tile label="Total check-ins" value={v.checkIns} />
                <Tile label="Registered patients" value={v.registeredCheckIns} note={v.uniquePatients === 1 ? '1 patient' : `${v.uniquePatients} different patients`} />
                <Tile label="Guests" value={v.guestCheckIns} />
                <Tile label="Patient records" value={v.patientRecords} note="active records" />
              </div>
              <table className="mk-rep__table">
                <thead>
                  <tr>
                    <th>Date</th><th>Check-ins</th><th>Registered</th><th>Guests</th>
                    <th>High Risk</th><th>Medium Risk</th><th>Not rated</th><th>Normal</th>
                  </tr>
                </thead>
                <tbody>
                  {v.byDay.length === 0 && (
                    <tr><td colSpan={8} className="mk-rep__muted">No check-ins yet.</td></tr>
                  )}
                  {v.byDay.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td><td>{d.checkIns}</td><td>{d.registered}</td><td>{d.guests}</td>
                      <td>{d.high}</td><td>{d.medium}</td><td>{d.notRated}</td><td>{d.normal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ---------------- kiosk usage ---------------- */}
            <section className="mk-rep__section">
              <h2>Kiosk usage</h2>
              <table className="mk-rep__table">
                <thead>
                  <tr>
                    <th>Kiosk</th><th>Setting</th><th>Connection</th><th>Check-ins</th><th>Today</th>
                    <th>Incomplete</th><th>Guests</th><th>Last check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.kioskUsage.map((k) => (
                    <tr key={k.kioskId}>
                      <td>
                        <strong>{k.name}</strong>
                        <span className="mk-rep__sub">{k.kioskId} · {k.clinic}</span>
                      </td>
                      <td>{k.status}</td>
                      <td><StatusBadge status={connectionBadge(k.connection)} /></td>
                      <td>{k.checkIns}</td>
                      <td>{k.checkInsToday}</td>
                      <td>{k.incomplete} ({k.incompleteRate}%)</td>
                      <td>{k.guests}</td>
                      <td>{fmtDateTimeSec(k.lastCheckIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
