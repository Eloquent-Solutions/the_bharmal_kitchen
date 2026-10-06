/**
 * System Security & Action Audit Logs
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full Firestore synchronization for immutable chronological audit trails.
 */

import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  Trash2,
  Download,
  RotateCw,
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { getAuditLogs, clearAuditLogs, logAuditEvent } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const loadLogs = () => {
    setLogs(getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('tbk_audit_logs_updated', handleUpdate);
    return () => {
      window.removeEventListener('tbk_audit_logs_updated', handleUpdate);
    };
  }, []);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear system security audit logs from local cache?')) {
      clearAuditLogs();
      logAuditEvent({
        action: 'Audit Log Cleared',
        user: 'Administrator',
        details: 'Admin cleared historical audit cache',
        ip: 'Security Console',
      });
      toast.success('Audit log cache cleared');
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    const headers = ['Audit ID', 'Timestamp', 'User', 'Action', 'Details', 'IP'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${(l.user || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.ip || 'POS',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported audit trail to CSV');
  };

  const actionsList = ['ALL', ...Array.from(new Set(logs.map((l) => l.action)))];

  const filtered = logs.filter((l) => {
    const matchesSearch =
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.id || '').toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>System Security & Audit Trail</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Immutable chronological record of bill voids, manager overrides, discounts, and inventory changes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handleClear} style={{ color: 'var(--color-danger)' }}>
            <Trash2 size={16} /> Clear Logs
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search action, user, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
            />
          </div>

          <select
            className="input"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ width: '200px', height: '38px', fontSize: 'var(--font-sm)' }}
          >
            {actionsList.map((act) => (
              <option key={act} value={act}>
                {act === 'ALL' ? 'All Event Types' : act}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Cloud Audit Records: <strong>{filtered.length}</strong> / {logs.length}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Audit ID</th>
                <th>Timestamp</th>
                <th>Staff User</th>
                <th>Event / Action</th>
                <th>Detailed Description</th>
                <th>Station / IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No audit records match the current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{log.id}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td style={{ fontWeight: '600' }}>{log.user}</td>
                    <td>
                      <span className="badge badge-primary">{log.action}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)' }}>{log.details}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      {log.ip}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
