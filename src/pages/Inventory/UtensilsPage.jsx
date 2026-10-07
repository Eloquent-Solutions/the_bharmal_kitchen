/**
 * Kitchen Utensils, Handis & Asset Tracker
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete) with live stock adjustments,
 * condition tracking, and direct integration with Purchase Bills.
 */

import { useState, useEffect } from 'react';
import {
  Utensils,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  getUtensils,
  saveUtensil,
  deleteUtensil,
} from '../../services/dataService';
import { formatCurrency, formatRecordId } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { isDemoMode, isInventoryOnly } from '../../firebase/config';
import { saveUtensilCloud } from '../../services/inventoryCloud';

export default function UtensilsPage() {
  const [utensils, setUtensils] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUtensil, setEditingUtensil] = useState(null);
  const [utensilToDelete, setUtensilToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Cookware',
    totalQty: 10,
    inUse: 5,
    inCleaning: 2,
    unitCost: 1500,
    condition: 'Excellent',
  });

  useEffect(() => {
    refreshData();
    window.addEventListener('tbk_utensils_updated', refreshData);
    return () => window.removeEventListener('tbk_utensils_updated', refreshData);
  }, []);

  const refreshData = () => {
    setUtensils(getUtensils());
  };

  const handleOpenAdd = () => {
    setEditingUtensil(null);
    setFormData({
      id: `UTN-${crypto.randomUUID()}`,
      name: '',
      category: 'Cookware',
      totalQty: 10,
      inUse: 0,
      inCleaning: 0,
      unitCost: 1500,
      condition: 'Excellent',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (utn) => {
    setEditingUtensil(utn);
    setFormData({
      name: utn.name,
      category: utn.category,
      totalQty: utn.totalQty,
      inUse: utn.inUse || 0,
      inCleaning: utn.inCleaning || 0,
      unitCost: utn.unitCost || 0,
      condition: utn.condition || 'Good',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (utn) => {
    setUtensilToDelete(utn);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Utensil name is required');
      return;
    }
    const total = Number(formData.totalQty);
    const inUse = Number(formData.inUse);
    const inCleaning = Number(formData.inCleaning);
    if (![total, inUse, inCleaning].every((value) => Number.isInteger(value) && value >= 0) || inUse + inCleaning > total) {
      toast.error('Asset quantities must be whole numbers, and in use plus cleaning cannot exceed total owned.');
      return;
    }

    const payload = {
      ...(editingUtensil || {}),
      id: editingUtensil?.id || formData.id,
      name: formData.name.trim(),
      category: formData.category,
      totalQty: Number(formData.totalQty) || 0,
      inUse: Number(formData.inUse) || 0,
      inCleaning: Number(formData.inCleaning) || 0,
      unitCost: Number(formData.unitCost) || 0,
      condition: formData.condition,
    };

    setSaving(true);
    try {
      if (isInventoryOnly && !isDemoMode) {
        await saveUtensilCloud(payload, editingUtensil);
      } else {
        setUtensils(saveUtensil(payload));
      }
      setIsModalOpen(false);
      toast.success(editingUtensil ? 'Utensil updated successfully!' : 'New utensil added to inventory!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!utensilToDelete) return;
    const updated = deleteUtensil(utensilToDelete.id);
    setUtensils(updated);
    setIsDeleteModalOpen(false);
    setUtensilToDelete(null);
    toast.success('Utensil asset removed');
  };

  const filtered = utensils.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.category.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Kitchen Utensils, Handis & Asset Inventory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Track authentic brass biryani handis, royal Bohra thaals, tandoor skewers, and assets.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Utensil / Handi
        </button>
      </div>

      {/* Filter / Search */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search utensil, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Assets: <strong>{filtered.length}</strong> types
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Utensil / Equipment Name</th>
                <th>Category</th>
                <th>Total Owned</th>
                <th>In Kitchen / Active</th>
                <th>In Washing</th>
                <th>Estimated Unit Cost</th>
                <th>Condition</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td title={u.id} style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{formatRecordId(u.id)}</td>
                  <td style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{u.name}</td>
                  <td>
                    <span className="badge badge-neutral">{u.category}</span>
                  </td>
                  <td style={{ fontWeight: '800' }}>{u.totalQty} Units</td>
                  <td style={{ color: 'var(--color-primary)', fontWeight: '700' }}>{u.inUse} In Use</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.inCleaning} In Wash</td>
                  <td>{formatCurrency(u.unitCost || 0)}</td>
                  <td>
                    <span className="badge badge-success">{u.condition}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(u)}
                        title="Edit Utensil"
                      >
                        <Edit2 size={14} />
                      </button>
                      {!isInventoryOnly && <button
                        className="btn-icon"
                        onClick={() => handleOpenDelete(u)}
                        title="Delete Utensil"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editingUtensil ? 'Edit Utensil Asset' : 'Add New Utensil Asset'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Utensil / Handi Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Heavy Brass Dum Handi (10kg)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Cookware">Cookware & Handis</option>
                    <option value="Service Ware">Service Ware & Thaals</option>
                    <option value="Tandoor Tools">Tandoor Skewers & Tools</option>
                    <option value="Cutlery">Cutlery & Bowls</option>
                  </select>
                </div>
                <div>
                  <label className="label">Condition</label>
                  <select
                    className="input"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Polishing">Needs Polishing</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Total Owned</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input"
                    value={formData.totalQty}
                    onChange={(e) => setFormData({ ...formData, totalQty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">In Active Use</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.inUse}
                    onChange={(e) => setFormData({ ...formData, inUse: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">In Cleaning</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={formData.inCleaning}
                    onChange={(e) => setFormData({ ...formData, inCleaning: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Asset Replacement / Unit Cost (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{editingUtensil ? 'Save Changes' : 'Create Asset'}</button>
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
              Delete Utensil
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to remove <strong>{utensilToDelete?.name}</strong>?
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
