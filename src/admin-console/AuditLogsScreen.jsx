import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getAuditLogs } from '../services/overviewService';
import './AuditLogsScreen.css';

export default function AuditLogsScreen() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      getAuditLogs(search).then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  function handleExport() {
    const header = 'Timestamp,Account,Action,Target,IP,Severity\n';
    const rows = logs
      .map((l) => [l.timestamp, l.role, l.actor, l.target, l.ip, l.severity].map(csv).join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medi-kiosk-audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    { key: 'timestamp', label: 'Timestamp', render: (row) => <span className="mk-audit__timestamp">{row.timestamp}</span> },
    { key: 'role', label: 'Account' },
    { key: 'actor', label: 'Action', render: (row) => <span className="mk-audit__actor">{row.actor}</span> },
    { key: 'target', label: 'Target' },
    { key: 'ip', label: 'IP' },
    { key: 'severity', label: 'Severity', render: (row) => <StatusBadge status={row.severity} /> },
  ];

  return (
    <AdminLayout>
      <AdminHeader title="Audit logs" />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__subtitle">
              Immutable trail of every administrative action and security event in the system.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button variant="ghost" onClick={handleExport}>Export CSV</Button>
          </div>
        </div>

        <DataTable
          searchPlaceholder="Search by account, action or target"
          columns={columns}
          rows={logs}
          searchValue={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No audit log entries match your search."
        />
      </div>
    </AdminLayout>
  );
}

// quotes cells so commas can't break the columns, and defuses spreadsheet formulas
function csv(v) {
  let t = String(v ?? '');
  if (/^[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}
