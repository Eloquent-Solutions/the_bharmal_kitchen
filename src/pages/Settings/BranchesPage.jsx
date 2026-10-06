/**
 * Multi-Branch & Outlets Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete) for Outlets and Cloud Kitchen Branches.
 */

import { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  MapPin,
  Phone,
  CheckCircle2,
  Building,
  Users,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  getBranches,
  saveBranch,
  deleteBranch,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Dine-in & Delivery',
    phone: '',
    address: '',
    tablesCount: 8,
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setBranches(getBranches());
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      type: 'Dine-in & Delivery',
      phone: '',
      address: '',
      tablesCount: 8,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBranch(b);
    setFormData({
      name: b.name,
      code: b.code,
      type: b.type,
      phone: b.phone,
      address: b.address,
      tablesCount: b.tablesCount,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (b) => {
    setBranchToDelete(b);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Branch Name and Code are required');
      return;
    }

    const payload = {
      ...(editingBranch || {}),
      name: formData.name.trim(),
      code: formData.code.trim(),
      type: formData.type,
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      tablesCount: Number(formData.tablesCount) || 0,
    };

    const updated = saveBranch(payload);
    setBranches(updated);
    setIsModalOpen(false);
    toast.success(editingBranch ? 'Branch outlet updated!' : 'New branch outlet created!');
  };

  const confirmDelete = () => {
    if (!branchToDelete) return;
    const updated = deleteBranch(branchToDelete.id);
    setBranches(updated);
    setIsDeleteModalOpen(false);
    setBranchToDelete(null);
    toast.success('Branch outlet deleted');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Multi-Branch & Outlets</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Manage dine-in flagship locations, satellite cloud kitchens, and outlet configuration.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Branch Outlet
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
        {branches.map((b) => (
          <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{b.name}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Code: {b.code}</div>
                </div>
                {b.isPrimary && <span className="badge badge-primary">Primary HQ</span>}
              </div>

              <div style={{ display: 'flex', gap: '8px', margin: 'var(--space-2) 0' }}>
                <span className="badge badge-info">{b.type}</span>
                <span className="badge badge-neutral">{b.tablesCount} Tables</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 'var(--space-3) 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: 'var(--color-primary)' }} /> {b.address}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} style={{ color: 'var(--color-primary)' }} /> {b.phone}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(b)}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleOpenDelete(b)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editingBranch ? 'Edit Branch' : 'Add Branch Outlet'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Branch Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Bandra West Cloud Kitchen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Branch Code</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="MUM-BW-02"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Outlet Type</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Dine-in & Delivery">Dine-in & Delivery</option>
                    <option value="Delivery & Takeaway Only">Delivery & Takeaway Only</option>
                    <option value="Dine-in Only">Dine-in Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Tables Count</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.tablesCount}
                    onChange={(e) => setFormData({ ...formData, tablesCount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Street Address</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingBranch ? 'Save Changes' : 'Save Outlet'}</button>
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
              Delete Branch
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete <strong>{branchToDelete?.name}</strong>?
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
