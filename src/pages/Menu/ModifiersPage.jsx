/**
 * Menu Modifiers & Add-ons Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete) for modifier groups and option prices.
 */

import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
} from 'lucide-react';
import {
  getModifiers,
  saveModifier,
  deleteModifier,
} from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ModifiersPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupToDelete, setGroupToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'single',
    optionsStr: 'Mild:0\nMedium:0\nExtra Spicy:0',
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setGroups(getModifiers());
  };

  const handleOpenAdd = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      type: 'single',
      optionsStr: 'Regular:0\nExtra Gravy:50\nExtra Ghee:30',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (grp) => {
    setEditingGroup(grp);
    const optionsStr = (grp.options || [])
      .map((opt) => `${opt.name}:${opt.price}`)
      .join('\n');
    setFormData({
      name: grp.name,
      type: grp.type || 'single',
      optionsStr,
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (grp) => {
    setGroupToDelete(grp);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Modifier group title is required');
      return;
    }

    const options = formData.optionsStr
      .split('\n')
      .map((line) => {
        const parts = line.split(':');
        return {
          name: parts[0]?.trim() || 'Option',
          price: Number(parts[1]?.trim()) || 0,
        };
      })
      .filter((o) => o.name);

    const payload = {
      ...(editingGroup || {}),
      name: formData.name.trim(),
      type: formData.type,
      options,
    };

    const updated = saveModifier(payload);
    setGroups(updated);
    setIsModalOpen(false);
    toast.success(editingGroup ? 'Modifier group updated!' : 'New modifier group created!');
  };

  const confirmDelete = () => {
    if (!groupToDelete) return;
    const updated = deleteModifier(groupToDelete.id);
    setGroups(updated);
    setIsDeleteModalOpen(false);
    setGroupToDelete(null);
    toast.success('Modifier group deleted');
  };

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Dish Modifiers & Add-ons</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Configure spice levels, biryani accompaniments, salan upgrades, and customized cooking preferences.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Create Modifier Group
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search modifiers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
        {filtered.map((grp) => (
          <div key={grp.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{grp.name}</h3>
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {grp.type === 'single' ? 'Radio (Choose 1)' : 'Multi-Select Addon'}
                  </span>
                </div>
                <span className="badge badge-primary">{grp.id}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 'var(--space-3) 0' }}>
                {grp.options?.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-glass-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                    <span>{opt.name}</span>
                    <span style={{ fontWeight: '700', color: opt.price > 0 ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
                      {opt.price > 0 ? `+${formatCurrency(opt.price)}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(grp)}>
                <Edit2 size={14} /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleOpenDelete(grp)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editingGroup ? 'Edit Modifier Group' : 'New Modifier Group'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Group Title</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Spice Level Selection"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Selection Mode</label>
                <select
                  className="input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="single">Single Selection (Must pick exactly 1)</option>
                  <option value="multiple">Multiple Selection (Can pick multiple)</option>
                </select>
              </div>

              <div>
                <label className="label">Options & Prices (Format: OptionName:Price per line)</label>
                <textarea
                  className="input"
                  rows={4}
                  value={formData.optionsStr}
                  onChange={(e) => setFormData({ ...formData, optionsStr: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingGroup ? 'Save Changes' : 'Create Group'}</button>
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
              Delete Modifier Group
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete <strong>{groupToDelete?.name}</strong>?
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
