/**
 * Stock Ledger & Material Movements
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Reads stock movement logs from Firebase-synced dataService.
 */

import { useState, useEffect } from 'react';
import { Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatDate, formatDateTime, formatRecordId } from '../../utils/formatters';
import { getStockMovements } from '../../services/dataService';
import './StockLedgerPage.css';

function openingCountDate(source) {
  const match = /^Opening Stock \(Handwritten count (\d{2})\/(\d{2})\/(\d{4})\)$/.exec(source || '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function movementIdLabel(id) {
  const openingId = /^MOV-OPEN-\d{8}-(\d+)$/.exec(id || '');
  return openingId ? `OPEN-${openingId[1]}` : formatRecordId(id);
}

export default function StockLedgerPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');

  const loadLogs = () => {
    setLogs(getStockMovements());
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('tbk_stock_movements_updated', handleUpdate);
    return () => window.removeEventListener('tbk_stock_movements_updated', handleUpdate);
  }, []);

  const filtered = logs.filter(
    (l) =>
      (l.material || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.source || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Stock Movement Ledger</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time audit of inventory inward deliveries, automatic KOT recipe deductions, and wastage adjustments.
          </p>
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Movements: <strong>{logs.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search material, source, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card stock-ledger-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table stock-ledger-table">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Date / Time</th>
                <th>Raw Material</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Trigger Source</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No stock movements recorded yet. Movements are automatically logged when stock is adjusted.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id}>
                    <td title={l.id} className="stock-ledger-id" style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{movementIdLabel(l.id)}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {openingCountDate(l.source) ? formatDate(openingCountDate(l.source)) : formatDateTime(l.date)}
                    </td>
                    <td style={{ fontWeight: '700' }}>{l.material}</td>
                    <td>
                      {l.type === 'inward' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowDownRight size={12} /> Inward Stock
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ArrowUpRight size={12} /> Outward Stock
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '800', color: l.type === 'inward' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {l.type === 'inward' ? `+${l.qty} ${l.unit}` : `-${l.qty} ${l.unit}`}
                    </td>
                    <td title={l.source} style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {openingCountDate(l.source) ? 'Opening Stock · Handwritten Count' : l.source}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)' }}>{l.user}</td>
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
