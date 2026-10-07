/**
 * Raw Materials Inventory Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Direct integration with Central Data Service & Firestore.
 * Real-time stock ledger, auto reorder triggers, and consumption logging.
 */

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  getRawMaterials,
  saveRawMaterial,
  deleteRawMaterial,
  adjustRawMaterialStock,
  addStockMovement,
} from '../../services/dataService';
import { formatCurrency, formatRecordId } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Meat & Poultry',
    currentStock: '',
    unit: 'kg',
    reorderLevel: 5,
    unitCost: '',
    supplier: '',
  });

  const categories = ['All', 'Meat & Poultry', 'Grains & Pulses', 'Dairy', 'Vegetables', 'Spices'];

  useEffect(() => {
    refreshData();
    window.addEventListener('tbk_raw_materials_updated', refreshData);
    return () => window.removeEventListener('tbk_raw_materials_updated', refreshData);
  }, []);

  const refreshData = () => {
    setMaterials(getRawMaterials());
  };

  const lowStockCount = materials.filter((m) => m.currentStock <= m.reorderLevel).length;

  const filtered = materials.filter((m) => {
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.supplier && m.supplier.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAdjustStock = (e) => {
    e.preventDefault();
    const qty = Number(adjustQty);
    try {
      const updated = adjustRawMaterialStock(
        adjustingItem.id, qty, adjustType,
        `Manual ${adjustType === 'add' ? 'Inward Delivery' : 'Outward Spoilage / Correction'}`
      );
      setMaterials(updated);
      toast.success(`Stock for ${adjustingItem.name} updated successfully!`);
      setAdjustingItem(null);
      setAdjustQty('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingMat(null);
    setFormData({
      name: '',
      category: 'Meat & Poultry',
      currentStock: '',
      unit: 'kg',
      reorderLevel: 5,
      unitCost: '',
      supplier: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (mat) => {
    setEditingMat(mat);
    setFormData({
      name: mat.name,
      category: mat.category,
      currentStock: mat.currentStock,
      unit: mat.unit,
      reorderLevel: mat.reorderLevel,
      unitCost: mat.unitCost,
      supplier: mat.supplier || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Material name is required');
      return;
    }

    const payload = {
      ...(editingMat || {}),
      name: formData.name.trim(),
      category: formData.category,
      currentStock: editingMat
        ? getRawMaterials().find((m) => m.id === editingMat.id)?.currentStock ?? editingMat.currentStock
        : Number(formData.currentStock),
      unit: formData.unit,
      reorderLevel: Number(formData.reorderLevel),
      unitCost: Number(formData.unitCost) || 0,
      supplier: formData.supplier.trim() || 'Direct Market',
    };

    if (!editingMat && (!Number.isFinite(payload.currentStock) || payload.currentStock < 0)) {
      toast.error('Opening stock must be zero or greater.');
      return;
    }
    if (!Number.isFinite(payload.reorderLevel) || payload.reorderLevel < 0 || !Number.isFinite(payload.unitCost) || payload.unitCost < 0) {
      toast.error('Reorder level and unit cost must be zero or greater.');
      return;
    }
    const updated = saveRawMaterial(payload);
    if (!editingMat && payload.currentStock > 0) {
      addStockMovement({ materialId: updated.at(-1).id, material: payload.name, type: 'inward', qty: payload.currentStock, unit: payload.unit, source: 'Opening Stock', user: 'Inventory Staff' });
    }
    setMaterials(updated);
    setIsAddModalOpen(false);
    toast.success(editingMat ? 'Material updated successfully!' : 'New material created!');
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to remove this raw material?')) {
      try {
        const updated = deleteRawMaterial(id);
        setMaterials(updated);
        toast.success('Raw material deleted');
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Raw Materials Inventory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time stock ledger, auto-deduction on POS orders, and recipe BOM links.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Raw Material
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Inventory Items</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{materials.length}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={14} /> Low Stock Warnings
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)' }}>
            {lowStockCount} items
          </div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Estimated Stock Valuation</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-primary)' }}>
            {formatCurrency(
              materials.reduce((sum, m) => sum + m.currentStock * m.unitCost, 0)
            )}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search material or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      {/* Materials Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Unit Cost</th>
                <th>Supplier</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mat) => {
                const isLow = mat.currentStock <= mat.reorderLevel;
                return (
                  <tr key={mat.id}>
                    <td title={mat.id} style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{formatRecordId(mat.id)}</td>
                    <td style={{ fontWeight: '600' }}>{mat.name}</td>
                    <td><span className="badge badge-neutral">{mat.category}</span></td>
                    <td style={{ fontWeight: '700' }}>
                      {mat.currentStock} {mat.unit}
                    </td>
                    <td style={{ color: 'var(--text-tertiary)' }}>
                      {mat.reorderLevel} {mat.unit}
                    </td>
                    <td>{formatCurrency(mat.unitCost)} / {mat.unit}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {mat.supplier}
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-danger">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">Sufficient</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setAdjustingItem(mat);
                            setAdjustType('add');
                          }}
                        >
                          Adjust
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(mat)}
                          title="Edit Material"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(mat.id)}
                          title="Delete Material"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="modal-backdrop" onClick={() => setAdjustingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: '8px' }}>
              Adjust Stock: {adjustingItem.name}
            </h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
              Current Level: <strong>{adjustingItem.currentStock} {adjustingItem.unit}</strong>
            </p>

            <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Adjustment Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className={`btn ${adjustType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAdjustType('add')}
                  >
                    + Add Delivery
                  </button>
                  <button
                    type="button"
                    className={`btn ${adjustType === 'subtract' ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => setAdjustType('subtract')}
                  >
                    - Deduct Spoilage
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Quantity ({adjustingItem.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  className="input"
                  placeholder={`Enter amount in ${adjustingItem.unit}...`}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustingItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Material Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingMat ? 'Edit Raw Material' : 'Add Raw Material'}
              </h3>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveMaterial} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Material Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Fresh Chicken, Basmati Rice..."
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
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Stock Unit</label>
                  <select
                    className="input"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    disabled={!!editingMat}
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="gms">gms (Gram)</option>
                    <option value="portion">portion</option>
                    <option value="liter">liter</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">{editingMat ? 'Current Stock (use Adjust Stock to change)' : 'Opening Stock'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={!!editingMat}
                    className="input"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Reorder Level Alert</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Al-Madina Poultry..."
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMat ? 'Save Changes' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
