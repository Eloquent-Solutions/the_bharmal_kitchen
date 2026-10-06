/**
 * Kitchen Order Ticket (KOT) Management & History
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full Firestore synchronization for KOT audit trail and station ticket logs.
 */

import { useState, useEffect } from 'react';
import {
  ChefHat,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  RotateCw,
} from 'lucide-react';
import { formatTime } from '../../utils/formatters';
import { getKots, updateKotStatus, logAuditEvent } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function KOTPage() {
  const [kots, setKots] = useState([]);
  const [search, setSearch] = useState('');

  const loadKots = () => {
    setKots(getKots());
  };

  useEffect(() => {
    loadKots();
    const handleUpdate = () => loadKots();
    window.addEventListener('tbk_kots_updated', handleUpdate);
    return () => {
      window.removeEventListener('tbk_kots_updated', handleUpdate);
    };
  }, []);

  const handleReprintKOT = (id) => {
    logAuditEvent({
      action: 'KOT Reprinted',
      user: 'Kitchen Staff',
      details: `Reprinting KOT #${id} slip to target station printer`,
      ip: 'KDS Terminal',
    });
    toast.success(`Reprinting KOT #${id} slip to target station printer...`);
  };

  const handleMarkComplete = (id) => {
    updateKotStatus(id, 'completed');
    toast.success(`KOT #${id} marked as completed`);
  };

  const filtered = kots.filter(
    (k) =>
      (k.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.orderId || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.station || '').toLowerCase().includes(search.toLowerCase()) ||
      (k.items || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>KOT Management & Station Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Audit generated Kitchen Order Tickets, reprint lost slips, and review station ticket logs.
          </p>
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Cloud KOTs: <strong>{kots.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search KOT, order, station, items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>KOT #</th>
                <th>Order Ref</th>
                <th>Table / Channel</th>
                <th>Target Station</th>
                <th>Food Items Summary</th>
                <th>Fired Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No KOT records found. KOTs are auto-generated when orders are placed.
                  </td>
                </tr>
              ) : (
                filtered.map((kot) => (
                  <tr key={kot.id}>
                    <td style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{kot.id}</td>
                    <td style={{ fontWeight: '600' }}>{kot.orderId}</td>
                    <td>
                      <span className="badge badge-neutral">{kot.table}</span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--color-warning)' }}>{kot.station}</td>
                    <td style={{ fontSize: 'var(--font-xs)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kot.items}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{kot.time}</td>
                    <td>
                      {kot.status === 'active' ? (
                        <span className="badge badge-warning">In Progress</span>
                      ) : (
                        <span className="badge badge-success">Completed</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        {kot.status === 'active' && (
                          <button className="btn btn-sm btn-success" onClick={() => handleMarkComplete(kot.id)}>
                            <CheckCircle2 size={13} /> Done
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => handleReprintKOT(kot.id)}>
                          <Printer size={13} /> Reprint
                        </button>
                      </div>
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
