/**
 * Shift Registers & Cashier Shifts
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Fully customizable via Admin:
 * - Load, Add, Edit, Close, Reconcile & Delete shifts
 * - Real-time persistence with getShifts / saveShift / deleteShift
 */

import { useState, useEffect } from 'react';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  DollarSign,
  Plus,
  Play,
  Square,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { getShifts, saveShift, deleteShift } from '../../services/dataService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ShiftsPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingShift, setClosingShift] = useState(null);
  const [actualCashCount, setActualCashCount] = useState('');

  // Form State
  const [newShiftName, setNewShiftName] = useState('Dinner Shift (4 PM - 12 AM)');
  const [customShiftName, setCustomShiftName] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [openingFloat, setOpeningFloat] = useState(3000);

  useEffect(() => {
    loadShifts();
    if (user?.displayName) {
      setCashierName(user.displayName);
    } else if (user?.email) {
      setCashierName(user.email.split('@')[0]);
    } else {
      setCashierName('Mustafa Bharmal');
    }
  }, [user]);

  const loadShifts = () => {
    setShifts(getShifts());
  };

  const activeShift = shifts.find((s) => s.status === 'active');

  const handleStartShift = (e) => {
    e.preventDefault();
    if (activeShift) {
      toast.error('An active shift is already running. Please close it first.');
      return;
    }

    const shiftDisplayName = newShiftName === 'Custom Shift' 
      ? (customShiftName.trim() || 'Custom Shift')
      : newShiftName;

    const floatAmount = Number(openingFloat) || 0;

    const created = {
      id: `SHF-${Math.floor(200 + Math.random() * 800)}`,
      cashier: cashierName.trim() || 'Staff Cashier',
      shiftName: shiftDisplayName,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingCash: floatAmount,
      totalSales: 0,
      status: 'active',
      expectedCash: floatAmount,
      actualCash: null,
      variance: null,
    };

    const updated = saveShift(created);
    setShifts(updated);
    setIsModalOpen(false);
    toast.success(`Shift "${shiftDisplayName}" started! Cashier register opened.`);
  };

  const handleOpenCloseModal = (shift) => {
    setClosingShift(shift);
    const expected = (shift.openingCash || 0) + (shift.totalSales || 0);
    setActualCashCount(expected.toString());
    setIsCloseModalOpen(true);
  };

  const handleConfirmCloseShift = (e) => {
    e.preventDefault();
    if (!closingShift) return;

    const actual = Number(actualCashCount) || 0;
    const expected = (closingShift.openingCash || 0) + (closingShift.totalSales || 0);
    const variance = actual - expected;

    const updatedPayload = {
      ...closingShift,
      status: 'closed',
      closedAt: new Date().toISOString(),
      expectedCash: expected,
      actualCash: actual,
      variance: variance,
    };

    const updatedList = saveShift(updatedPayload);
    setShifts(updatedList);
    setIsCloseModalOpen(false);
    setClosingShift(null);

    if (variance === 0) {
      toast.success('Shift closed successfully! Perfect cash drawer match.');
    } else if (variance > 0) {
      toast.success(`Shift closed with Surplus of ${formatCurrency(variance)}.`);
    } else {
      toast.error(`Shift closed with Shortage of ${formatCurrency(Math.abs(variance))}!`);
    }
  };

  const handleDeleteShift = (shiftId, shiftName) => {
    if (window.confirm(`Are you sure you want to delete shift record "${shiftName}" (${shiftId})?`)) {
      const updated = deleteShift(shiftId);
      setShifts(updated);
      toast.success(`Shift ${shiftId} deleted.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Shift Registers & Cashier Handover</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Track individual cashier sessions, opening floats, closing reconciliations, and cash drawer variance. Fully customizable.
          </p>
        </div>
        {!activeShift && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Play size={16} /> Open New Shift
          </button>
        )}
      </div>

      {/* Active Shift Banner */}
      {activeShift ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)', background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.08), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="badge badge-success">● Active Shift Session</span>
                <span style={{ fontWeight: '700', fontSize: 'var(--font-lg)' }}>{activeShift.shiftName}</span>
              </div>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Cashier: <strong>{activeShift.cashier}</strong> • Opened at {formatDateTime(activeShift.openedAt)} • Float: {formatCurrency(activeShift.openingCash)}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Shift Sales</div>
                <div style={{ fontSize: 'var(--font-xl)', fontWeight: '800', color: 'var(--color-primary)' }}>
                  {formatCurrency(activeShift.totalSales)}
                </div>
              </div>

              <button
                className="btn btn-warning"
                onClick={() => handleOpenCloseModal(activeShift)}
              >
                <Square size={14} /> Close & Reconcile Shift
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No active shift running currently. Click <strong>"Open New Shift"</strong> to begin cashier register session.
        </div>
      )}

      {/* Shift History Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>
            Past Shift Logs & Handover History ({shifts.length})
          </span>
        </div>

        {shifts.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No shifts recorded yet. Open a new shift to begin tracking.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Shift ID</th>
                  <th>Shift Session</th>
                  <th>Cashier</th>
                  <th>Opened / Closed</th>
                  <th>Opening Float</th>
                  <th>Total Sales</th>
                  <th>Reconciliation</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{s.id}</td>
                    <td style={{ fontWeight: '600' }}>{s.shiftName}</td>
                    <td>{s.cashier}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      <div>{formatDateTime(s.openedAt)}</div>
                      {s.closedAt && <div style={{ color: 'var(--text-tertiary)' }}>to {formatDateTime(s.closedAt)}</div>}
                    </td>
                    <td style={{ fontWeight: '600' }}>{formatCurrency(s.openingCash)}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatCurrency(s.totalSales)}</td>
                    <td style={{ fontSize: '12px' }}>
                      {s.status === 'closed' ? (
                        s.variance === 0 ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>✓ Balanced</span>
                        ) : s.variance > 0 ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>+{formatCurrency(s.variance)} Surplus</span>
                        ) : (
                          <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>-{formatCurrency(Math.abs(s.variance))} Shortage</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>In progress</span>
                      )}
                    </td>
                    <td>
                      {s.status === 'active' ? (
                        <span className="badge badge-success">Running</span>
                      ) : (
                        <span className="badge badge-neutral">Closed & Audited</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {s.status === 'active' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleOpenCloseModal(s)}
                            title="Close Shift"
                          >
                            Close
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteShift(s.id, s.shiftName)}
                          style={{ color: 'var(--color-danger)' }}
                          title="Delete Shift Log"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Start New Cashier Shift</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleStartShift} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Shift Timing / Session</label>
                <select
                  className="input"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                >
                  <option value="Lunch Shift (11 AM - 4 PM)">Lunch Shift (11 AM - 4 PM)</option>
                  <option value="Dinner Shift (4 PM - 12 AM)">Dinner Shift (4 PM - 12 AM)</option>
                  <option value="Midnight Shift (12 AM - 4 AM)">Midnight Shift (12 AM - 4 AM)</option>
                  <option value="Full Day Shift">Full Day Shift</option>
                  <option value="Custom Shift">Custom Shift Name...</option>
                </select>
              </div>

              {newShiftName === 'Custom Shift' && (
                <div>
                  <label className="label">Custom Shift Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Sunday Brunch Special (10 AM - 3 PM)"
                    required
                    value={customShiftName}
                    onChange={(e) => setCustomShiftName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="label">Cashier / Staff Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Mustafa Bharmal"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Opening Float Cash in Drawer (₹)</label>
                <input
                  type="number"
                  className="input"
                  required
                  min="0"
                  step="50"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                  Petty cash placed in the register at the beginning of shift for customer change.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Begin Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close & Reconcile Shift Modal */}
      {isCloseModalOpen && closingShift && (
        <div className="modal-backdrop" onClick={() => setIsCloseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Close & Reconcile Shift</h3>
              <button className="btn-icon" onClick={() => setIsCloseModalOpen(false)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
              <div>Shift: <strong>{closingShift.shiftName}</strong></div>
              <div>Cashier: <strong>{closingShift.cashier}</strong></div>
              <div>Opening Float: <strong>{formatCurrency(closingShift.openingCash)}</strong></div>
              <div>Total Sales: <strong>{formatCurrency(closingShift.totalSales)}</strong></div>
              <div style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', fontWeight: '700' }}>
                Expected Cash in Drawer: {formatCurrency((closingShift.openingCash || 0) + (closingShift.totalSales || 0))}
              </div>
            </div>

            <form onSubmit={handleConfirmCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Actual Cash Counted in Drawer (₹)</label>
                <input
                  type="number"
                  className="input"
                  required
                  min="0"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(e.target.value)}
                />
              </div>

              {actualCashCount !== '' && (
                <div style={{ fontSize: '13px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)' }}>
                  Variance:{' '}
                  {Number(actualCashCount) - ((closingShift.openingCash || 0) + (closingShift.totalSales || 0)) === 0 ? (
                    <strong style={{ color: 'var(--color-success)' }}>₹0 (Perfect Match)</strong>
                  ) : Number(actualCashCount) - ((closingShift.openingCash || 0) + (closingShift.totalSales || 0)) > 0 ? (
                    <strong style={{ color: 'var(--color-primary)' }}>
                      +{formatCurrency(Number(actualCashCount) - ((closingShift.openingCash || 0) + (closingShift.totalSales || 0)))} (Surplus)
                    </strong>
                  ) : (
                    <strong style={{ color: 'var(--color-danger)' }}>
                      -{formatCurrency(Math.abs(Number(actualCashCount) - ((closingShift.openingCash || 0) + (closingShift.totalSales || 0))))} (Shortage)
                    </strong>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCloseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Confirm & Close Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
