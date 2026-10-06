/**
 * Combos & Bohra Thaal Packages
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Delete) with direct item picker from Menu Items catalog.
 * Direct selection in POS with inventory portion awareness.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Users,
  CheckCircle2,
  Search,
  Sparkles,
  Layers,
  X,
  ShoppingBag,
} from 'lucide-react';
import {
  getCombos,
  saveCombo,
  deleteCombo,
  getMenuItems,
} from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboToDelete, setComboToDelete] = useState(null);

  // Selected dish items within combo
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    serves: '2-3 Guests',
    price: 1800,
    image: '',
    description: '',
  });

  const refreshData = useCallback(() => {
    setCombos(getCombos());
    const items = getMenuItems();
    setMenuItems(items);
    if (items.length > 0) {
      setSelectedMenuItemId((current) => current || items[0].id);
    }
  }, []);

  useEffect(() => {
    refreshData();
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, [refreshData]);

  const handleOpenAdd = () => {
    setEditingCombo(null);
    setFormData({
      name: '',
      serves: '2-3 Guests',
      price: 1800,
      image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80',
      description: 'Handcrafted signature Bohra feast package.',
    });
    setSelectedDishes([
      { itemId: 'ITEM-03', name: 'Mutton Seekh Kebab (4 Pcs)', qty: 1, price: 380 },
      { itemId: 'ITEM-02', name: 'Chicken Biryani (Dum Handi)', qty: 1, price: 340 },
      { itemId: 'ITEM-06', name: 'Dal Makhani Bukhara', qty: 1, price: 260 },
      { itemId: 'ITEM-05', name: 'Butter Naan', qty: 4, price: 45 },
      { itemId: 'ITEM-07', name: 'Gulab Jamun (Warm, 2 Pcs)', qty: 2, price: 80 },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCombo(c);
    setFormData({
      name: c.name,
      serves: c.serves,
      price: c.price,
      image: c.image || '',
      description: c.description || '',
    });

    // Parse existing contents into dish list
    if (c.dishItems && c.dishItems.length > 0) {
      setSelectedDishes(c.dishItems);
    } else if (c.contents && c.contents.length > 0) {
      setSelectedDishes(
        c.contents.map((str, idx) => ({
          itemId: `CUSTOM-${idx}`,
          name: str,
          qty: 1,
          price: 0,
        }))
      );
    } else {
      setSelectedDishes([]);
    }
    setIsModalOpen(true);
  };

  const handleAddDishToCombo = () => {
    const item = menuItems.find((m) => m.id === selectedMenuItemId);
    if (!item) return;

    const existingIdx = selectedDishes.findIndex((d) => d.itemId === item.id);
    if (existingIdx !== -1) {
      const updated = [...selectedDishes];
      updated[existingIdx].qty += Number(selectedQty) || 1;
      setSelectedDishes(updated);
    } else {
      setSelectedDishes([
        ...selectedDishes,
        {
          itemId: item.id,
          name: item.name,
          qty: Number(selectedQty) || 1,
          price: item.price,
        },
      ]);
    }
    toast.success(`Added ${item.name} to package`);
  };

  const handleRemoveDish = (idx) => {
    setSelectedDishes(selectedDishes.filter((_, i) => i !== idx));
  };

  const handleSaveCombo = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Combo package name is required');
      return;
    }
    if (selectedDishes.length === 0) {
      toast.error('Please add at least one dish item from menu');
      return;
    }

    const contents = selectedDishes.map((d) => `${d.name} (${d.qty}x)`);

    const comboPayload = {
      ...(editingCombo ? { id: editingCombo.id } : {}),
      name: formData.name.trim(),
      serves: formData.serves,
      price: Number(formData.price),
      image: formData.image || 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80',
      description: formData.description,
      dishItems: selectedDishes,
      contents,
      isAvailable: true,
    };

    saveCombo(comboPayload);
    setCombos(getCombos());
    setIsModalOpen(false);
    toast.success(editingCombo ? 'Combo package updated!' : 'New Bohra Thaal combo created!');
  };

  const handleOpenDelete = (c) => {
    setComboToDelete(c);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!comboToDelete) return;
    deleteCombo(comboToDelete.id);
    setCombos(getCombos());
    setIsDeleteModalOpen(false);
    setComboToDelete(null);
    toast.success('Combo package deleted');
  };

  const filteredCombos = combos.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAlaCarteValue = selectedDishes.reduce(
    (sum, d) => sum + (d.price || 0) * (d.qty || 1),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Combos & Bohra Thaals</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Curated feast packages, royal Bohra thaals, multi-course platters, and POS quick-add packages.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Create New Combo
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search combo packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Packages: <strong>{filteredCombos.length}</strong>
        </div>
      </div>

      {/* Combos Grid */}
      {filteredCombos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
          <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>No Combos Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Create combo meal deals picking dishes directly from your Menu Items.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredCombos.map((c) => (
            <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Image */}
              <div style={{ height: '160px', position: 'relative', overflow: 'hidden', background: '#222' }}>
                <img
                  src={c.image || 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80'}
                  alt={c.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)' }}>
                  👑 {c.serves}
                </div>
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--color-primary)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: '800' }}>
                  {formatCurrency(c.price)}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{c.name}</h3>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                    {c.description}
                  </p>

                  <div style={{ marginTop: 'var(--space-3)', background: 'var(--bg-glass-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>Package Dishes:</div>
                    <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(c.contents || []).map((itemStr, idx) => (
                        <li key={idx}>{itemStr}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)}>
                    <Edit2 size={13} /> Edit Package
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenDelete(c)} style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Combo Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingCombo ? 'Edit Combo Package' : 'Create New Combo Package'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveCombo} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Package / Thaal Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. The Grand Bohra Royal Thaal (8 Pax)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Serving Size (Pax)</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. 7-8 Guests"
                    value={formData.serves}
                    onChange={(e) => setFormData({ ...formData, serves: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Package Price (₹)</label>
                  <input
                    type="number"
                    className="input"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Package Image URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="Brief summary of this royal feast..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Item Picker from Menu Items */}
              <div style={{ background: 'var(--bg-glass)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label className="label" style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                  Add Dishes from Restaurant Menu:
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select
                    className="input"
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {menuItems.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({formatCurrency(m.price)})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="input"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Number(e.target.value))}
                    style={{ width: '65px' }}
                    title="Quantity"
                  />

                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddDishToCombo}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                {/* Added Dishes List */}
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Selected Dishes in Package:</div>
                  {selectedDishes.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No dishes selected yet. Pick from dropdown above.
                    </div>
                  ) : (
                    selectedDishes.map((dish, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'var(--bg-surface)',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>
                          {dish.name} <span style={{ color: 'var(--color-primary)' }}>× {dish.qty}</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {dish.price > 0 && (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {formatCurrency(dish.price * dish.qty)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleRemoveDish(idx)}
                            style={{ width: '22px', height: '22px', color: 'var(--color-danger)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {totalAlaCarteValue > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '4px' }}>
                      Individual Menu Value: <strong>{formatCurrency(totalAlaCarteValue)}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCombo ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: 'var(--space-2)' }}>
              Confirm Delete
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete combo package "<strong>{comboToDelete?.name}</strong>"?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>
                Delete Combo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
