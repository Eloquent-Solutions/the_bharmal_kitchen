/**
 * Staff Leave Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete, Approve, Reject) for Staff Leave Requests.
 * Supports Paid Leave vs Unpaid Leave (with automatic salary deduction in Payroll).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  getLeaves,
  saveLeave,
  deleteLeave,
  updateLeaveStatus,
  getStaff,
} from '../../services/dataService';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  const [form, setForm] = useState({
    staffId: '',
    staffName: '',
    role: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    days: 1,
    isPaid: false,
    type: 'Casual Leave',
    reason: '',
  });

  const refreshData = useCallback(() => {
    setLeaves(getLeaves());
    const staff = getStaff();
    setStaffList(staff);
    if (staff.length > 0) {
      setForm((prev) => prev.staffId ? prev : ({
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

  const handleOpenAdd = () => {
    setEditingLeave(null);
    const first = staffList[0] || {};
    setForm({
      staffId: first.id || '',
      staffName: first.name || '',
      role: first.role || '',
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      days: 1,
      isPaid: false,
      type: 'Casual Leave',
      reason: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (l) => {
    setEditingLeave(l);
    setForm({
      staffId: l.staffId || '',
      staffName: l.staffName || '',
      role: l.role || '',
      fromDate: l.fromDate || new Date().toISOString().split('T')[0],
      toDate: l.toDate || new Date().toISOString().split('T')[0],
      days: l.days || 1,
      isPaid: l.isPaid !== undefined ? Boolean(l.isPaid) : false,
      type: l.type || 'Casual Leave',
      reason: l.reason || '',
    });
    setIsModalOpen(true);
  };

  const handleStaffSelect = (staffId) => {
    const s = staffList.find((member) => member.id === staffId);
    if (s) {
      setForm({ ...form, staffId: s.id, staffName: s.name, role: s.role });
    }
  };

  const handleSaveLeave = (e) => {
    e.preventDefault();
    if (!form.staffName || !form.reason.trim()) {
      toast.error('Please select staff member and enter leave reason');
      return;
    }

    saveLeave({
      ...(editingLeave ? { id: editingLeave.id } : {}),
      staffId: form.staffId,
      staffName: form.staffName,
      role: form.role,
      fromDate: form.fromDate,
      toDate: form.toDate,
      days: Number(form.days) || 1,
      isPaid: Boolean(form.isPaid),
      type: form.type,
      reason: form.reason.trim(),
      status: editingLeave ? editingLeave.status : 'approved',
    });

    setLeaves(getLeaves());
    setIsModalOpen(false);
    toast.success(editingLeave ? 'Leave request updated!' : 'Staff leave scheduled successfully!');
  };

  const handleAction = (id, newStatus) => {
    updateLeaveStatus(id, newStatus);
    setLeaves(getLeaves());
    toast.success(`Leave request marked as ${newStatus.toUpperCase()}`);
  };

  const handleDelete = (id, staffName) => {
    if (window.confirm(`Delete leave record for ${staffName}?`)) {
      deleteLeave(id);
      setLeaves(getLeaves());
      toast.success('Leave record deleted');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Staff Leave Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Approve, schedule, and categorize paid vs unpaid leaves (with automatic payroll deduction).
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Apply / Record Leave
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Compensation</th>
                <th>Duration</th>
                <th>Total Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No leave requests found. Click "Apply / Record Leave" to add a leave.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{l.id}</td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{l.staffName}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{l.role}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{l.type}</span>
                    </td>
                    <td>
                      {l.isPaid ? (
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          🟢 Paid Leave
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                          🟡 Unpaid (Deducted)
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {formatDate(l.fromDate)} to {formatDate(l.toDate)}
                    </td>
                    <td style={{ fontWeight: '600' }}>{l.days} Day(s)</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', maxWidth: '200px' }}>{l.reason}</td>
                    <td>
                      {l.status === 'approved' && <span className="badge badge-success">Approved</span>}
                      {l.status === 'pending' && <span className="badge badge-warning">Pending</span>}
                      {l.status === 'rejected' && <span className="badge badge-danger">Rejected</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        {l.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleAction(l.id, 'approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleAction(l.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(l)}
                          title="Edit Leave"
                          style={{ width: '26px', height: '26px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(l.id, l.staffName)}
                          title="Delete Leave"
                          style={{ width: '26px', height: '26px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingLeave ? 'Edit Leave Record' : 'Record Staff Leave'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Select Staff Member</label>
                <select
                  className="input"
                  required
                  value={form.staffId}
                  onChange={(e) => handleStaffSelect(e.target.value)}
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Leave Type</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Medical / Sick">Medical / Sick</option>
                    <option value="Family Function">Family Function</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="label">Compensation Mode</label>
                  <select
                    className="input"
                    value={form.isPaid ? 'paid' : 'unpaid'}
                    onChange={(e) => setForm({ ...form, isPaid: e.target.value === 'paid' })}
                  >
                    <option value="unpaid">Unpaid Leave (Deduct Pay)</option>
                    <option value="paid">Paid Leave (Full Salary)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">From Date</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.fromDate}
                    onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.toDate}
                    onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Total Leave Days</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="input"
                  required
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Reason / Justification</label>
                <textarea
                  className="input"
                  rows="2"
                  required
                  placeholder="e.g. Doctor appointment, family function in Surat"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingLeave ? 'Save Changes' : 'Schedule Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
