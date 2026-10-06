/**
 * Staff Directory Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete) for Staff & Team Members.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Shield,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  getStaff,
  saveStaff,
  deleteStaff,
} from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function StaffListPage() {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Waiter',
    phone: '',
    salary: 25000,
    shift: 'Full Day',
    status: 'active',
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setStaff(getStaff());
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      role: 'Waiter',
      phone: '',
      salary: 25000,
      shift: 'Full Day',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      role: s.role,
      phone: s.phone,
      salary: s.salary,
      shift: s.shift || 'Full Day',
      status: s.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (s) => {
    setStaffToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Staff name and contact number are required');
      return;
    }

    const payload = {
      ...(editingStaff || {}),
      name: formData.name.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      salary: Number(formData.salary) || 0,
      shift: formData.shift,
      status: formData.status,
    };

    const updated = saveStaff(payload);
    setStaff(updated);
    setIsModalOpen(false);
    toast.success(editingStaff ? 'Staff profile updated!' : 'New staff member onboarded!');
  };

  const confirmDelete = () => {
    if (!staffToDelete) return;
    const updated = deleteStaff(staffToDelete.id);
    setStaff(updated);
    setIsDeleteModalOpen(false);
    setStaffToDelete(null);
    toast.success('Staff member removed');
  };

  const toggleStatus = (s) => {
    const updated = saveStaff({ ...s, status: s.status === 'active' ? 'inactive' : 'active' });
    setStaff(updated);
    toast.success(`Employment status updated for ${s.name}`);
  };

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Staff Directory & Roles</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Employee profiles, designated roles, monthly compensation, and shift assignments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Onboard Staff Member
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, role, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Active Employees: <strong>{staff.filter((s) => s.status === 'active').length}</strong> / {staff.length}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Employee Name</th>
                <th>Role / Designation</th>
                <th>Contact</th>
                <th>Shift Assignment</th>
                <th>Monthly Salary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{s.id}</td>
                  <td style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{s.name}</td>
                  <td>
                    <span className="badge badge-info">{s.role}</span>
                  </td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{s.phone}</td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{s.shift}</td>
                  <td style={{ fontWeight: '700' }}>{formatCurrency(s.salary)}</td>
                  <td>
                    <button
                      className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => toggleStatus(s)}
                    >
                      {s.status === 'active' ? '● Active' : '✕ Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => handleOpenEdit(s)} title="Edit Staff">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => handleOpenDelete(s)} title="Delete Staff" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editingStaff ? 'Edit Staff Profile' : 'Onboard Staff Member'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Aslam Qureshi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Assigned Role</label>
                  <select
                    className="input"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="Owner">Owner</option>
                    <option value="Chef">Chef (Bawarchi)</option>
                    <option value="Kitchen Staff">Kitchen Staff</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Waiter">Waiter / Captain</option>
                  </select>
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    className="input"
                    placeholder="+91 98200..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    required
                    className="input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Shift Timing</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Morning (11 AM - 8 PM)"
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingStaff ? 'Save Changes' : 'Save Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>
              Remove Staff Member
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to remove <strong>{staffToDelete?.name}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
