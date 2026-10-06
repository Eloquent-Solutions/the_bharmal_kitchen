/**
 * Staff Salary Advances & Loans
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Disburse, Track, Delete) for Staff Salary Advances.
 * Auto-deducted on monthly payroll computation.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Trash2,
} from 'lucide-react';
import {
  getAdvances,
  saveAdvance,
  deleteAdvance,
  getStaff,
} from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function AdvancesPage() {
  const [advances, setAdvances] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdv, setNewAdv] = useState({ staffId: '', staffName: '', role: '', amount: '', reason: '' });

  const refreshData = useCallback(() => {
    setAdvances(getAdvances());
    const staff = getStaff();
    setStaffList(staff);
    if (staff.length > 0) {
      setNewAdv((prev) => prev.staffId ? prev : ({
        ...prev,
        staffId: staff[0].id,
        staffName: staff[0].name,
        role: staff[0].role,
      }));
    }
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [refreshData]);

  const handleStaffSelect = (staffId) => {
    const s = staffList.find((member) => member.id === staffId);
    if (s) {
      setNewAdv({ ...newAdv, staffId: s.id, staffName: s.name, role: s.role });
    }
  };

  const handleCreateAdvance = (e) => {
    e.preventDefault();
    if (!newAdv.amount || Number(newAdv.amount) <= 0) {
      toast.error('Please enter a positive advance amount');
      return;
    }
    saveAdvance({
      staffId: newAdv.staffId,
      staffName: newAdv.staffName,
      role: newAdv.role,
      amount: Number(newAdv.amount),
      date: new Date().toISOString().split('T')[0],
      reason: newAdv.reason || 'Personal emergency',
      recoveryMonth: 'September 2026',
      status: 'approved',
    });
    setAdvances(getAdvances());
    setIsModalOpen(false);
    setNewAdv({ ...newAdv, amount: '', reason: '' });
    toast.success('Salary advance recorded & scheduled for payroll deduction');
  };

  const handleDelete = (id, staffName) => {
    if (window.confirm(`Delete advance record for ${staffName}?`)) {
      deleteAdvance(id);
      setAdvances(getAdvances());
      toast.success('Advance record deleted');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Staff Salary Advances</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Mid-month salary advance disbursements with auto-deduction on monthly payroll.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Disburse Advance
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Staff Member</th>
                <th>Disbursed Date</th>
                <th>Reason</th>
                <th>Recovery Month</th>
                <th style={{ textAlign: 'right' }}>Advance Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No salary advances recorded.
                  </td>
                </tr>
              ) : (
                advances.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{a.id}</td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{a.staffName}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{a.role}</div>
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{formatDate(a.date)}</td>
                    <td style={{ fontSize: 'var(--font-xs)' }}>{a.reason}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--color-primary)' }}>{a.recoveryMonth}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-danger)' }}>{formatCurrency(a.amount)}</td>
                    <td>
                      <span className="badge badge-success">Approved & Active</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(a.id, a.staffName)}
                        title="Delete Advance"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Disburse Salary Advance</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateAdvance} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Select Staff Member</label>
                <select
                  className="input"
                  required
                  value={newAdv.staffId}
                  onChange={(e) => handleStaffSelect(e.target.value)}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Advance Amount (₹)</label>
                <input
                  type="number"
                  className="input"
                  required
                  placeholder="3000"
                  value={newAdv.amount}
                  onChange={(e) => setNewAdv({ ...newAdv, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Reason / Justification</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Medical emergency, bike repair"
                  value={newAdv.reason}
                  onChange={(e) => setNewAdv({ ...newAdv, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
