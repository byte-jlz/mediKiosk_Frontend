import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getAuditLogs } from '../services/auditService';
import './AuditLogsScreen.css';

export default function AuditLogsScreen() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = () => {
      setLoading(true);
      getAuditLogs(search).then((data) => {
        setLogs(data);
        setLoading(false);
      });
    };

    loadLogs();
    window.addEventListener('mk-admin-store-updated', loadLogs);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadLogs);
    };
  }, [search]);

  function handleExport() {
    const header = 'Timestamp,Role,Actor,Target,IP,Severity\n';
    const rows = logs
      .map((l) => [l.timestamp, l.role, l.actor, l.target, l.ip, l.severity].join(','))
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
    { key: 'role', label: 'Role' },
    { key: 'actor', label: 'Actor', render: (row) => <span className="mk-audit__actor">{row.actor}</span> },
    { key: 'target', label: 'Target' },
    { key: 'ip', label: 'IP' },
    { key: 'severity', label: 'Severity', render: (row) => <StatusBadge status={row.severity} /> },
  ];

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">View System Logs / Audit Trails</p>
            <h1 className="mk-page__title">Audit logs</h1>
            <p className="mk-page__subtitle">
              Immutable trail of every administrative action and security event in the system.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button variant="ghost" onClick={handleExport}>Export CSV</Button>
          </div>
        </div>

        <DataTable
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
