import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getAuditLogs } from '../services/auditService';
import './AuditLogsScreen.css';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * "View system logs / audit trail" (Super Admin). Every sign-in, every view
 * of a patient's record or vitals, and every change to staff, patients and
 * kiosks - who did it, when, from which IP. Entries can't be edited or deleted.
 */
export default function AuditLogsScreen() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getAuditLogs(search)
      .then((rows) => {
        setLogs(rows);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  function handleExport() {
    const header = ['Timestamp', 'Who', 'Action', 'Target', 'IP', 'Severity'].map(csvCell).join(',');
    const rows = logs.map((l) =>
      [l.timestamp, l.actor, l.action, l.target, l.ip, l.severity].map(csvCell).join(','));
    const blob = new Blob(['﻿' + [header, ...rows].join('\r\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medikiosk-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: 'timestamp', label: 'When', render: (row) => <span className="mk-audit__timestamp">{row.timestamp}</span> },
    { key: 'actor', label: 'Who', render: (row) => <span className="mk-audit__actor">{row.actor}</span> },
    { key: 'action', label: 'Action', render: (row) => <span className="mk-audit__action">{row.action}</span> },
    { key: 'target', label: 'Target' },
    { key: 'ip', label: 'IP' },
    { key: 'severity', label: 'Severity', render: (row) => <StatusBadge status={row.severity} /> },
  ];

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">View System Logs / Audit Trail</p>
            <h1 className="mk-page__title">Audit trail</h1>
            <p className="mk-page__subtitle">
              Who signed in, who opened which patient record, and who changed staff, patients or
              kiosks. Entries cannot be edited or deleted.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button variant="ghost" onClick={load}>↻ Refresh</Button>
            <Button variant="ghost" onClick={handleExport} disabled={!logs.length}>Export CSV</Button>
          </div>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}

        <DataTable
          columns={columns}
          rows={logs}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by person, action, record ID or IP…"
          loading={loading}
          emptyMessage={search ? 'No audit entries match your search.' : 'No audit entries yet.'}
        />
      </div>
    </AdminLayout>
  );
}
