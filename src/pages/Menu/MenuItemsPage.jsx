/**
 * Menu Items (Dishes) Catalog
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD with Image Links, Raw Material Portion Calculations, Food Costing & 86 Controls.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  DollarSign,
  Flame,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import {
  getMenuItems,
  saveMenuItem,
  deleteMenuItem,
  toggleMenuItemStock,
  getCategories,
  calculateDishPortionsAvailable,
} from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function MenuItemsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Mains & Biryanis',
    price: '',
    costPrice: '',
    type: 'non-veg',
    station: 'Curry / Biryani',
    prepTime: 15,
    isSpecial: false,
    image: '',
    description: '',
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setItems(getMenuItems());
    setCategories(getCategories());
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    const defaultCat = categories.length > 0 ? categories[0].name : 'Mains & Biryanis';
    setFormData({
      name: '',
      category: defaultCat,
      price: '',
      costPrice: '',
      type: 'non-veg',
      station: 'Curry / Biryani',
      prepTime: 15,
      isSpecial: false,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      costPrice: item.costPrice,
      type: item.type,
      station: item.station,
      prepTime: item.prepTime,
      isSpecial: item.isSpecial || false,
      image: item.image || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Dish title and selling price are required');
      return;
    }

    const payload = {
      ...(editingItem || {}),
      name: formData.name.trim(),
      category: formData.category,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice) || 0,
      type: formData.type,
      station: formData.station,
      prepTime: Number(formData.prepTime) || 15,
      isSpecial: !!formData.isSpecial,
      image: formData.image.trim(),
      description: formData.description.trim(),
    };

    const updated = saveMenuItem(payload);
    setItems(updated);
    setIsModalOpen(false);
    toast.success(editingItem ? 'Dish updated successfully!' : 'New dish added to catalog!');
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    const updated = deleteMenuItem(itemToDelete.id);
    setItems(updated);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    toast.success('Dish removed from menu');
  };

  const handleToggleStock = (id) => {
    const updated = toggleMenuItemStock(id);
    setItems(updated);
    const itm = updated.find((i) => i.id === id);
    toast.success(`Dish "${itm.name}" marked as ${itm.isAvailable ? 'IN STOCK' : '86 / SOLD OUT'}`);
  };

  const filtered = items.filter((item) => {
    const matchesCat =
      categoryFilter === 'All'
        ? true
        : categoryFilter === 'Uncategorized'
        ? !item.category || item.category === '' || item.category === 'Uncategorized'
        : item.category === categoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Menu Dishes Catalog</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Dish images from URL links, food costing, kitchen station routing, and 86 availability.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Menu Dish
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {['All', 'Uncategorized', ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
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
            placeholder="Search dishes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      {/* Dishes Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Photo</th>
                <th>Dish Title</th>
                <th>Category</th>
                <th>Price (₹)</th>
                <th>Raw Stock Ready</th>
                <th>Kitchen Station</th>
                <th>Prep Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const portionInfo = calculateDishPortionsAvailable(item.id, item.name);

                return (
                  <tr key={item.id} style={{ opacity: item.isAvailable !== false ? 1 : 0.6 }}>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          border: `1.5px solid ${item.type === 'veg' ? '#22c55e' : '#ef4444'}`,
                          borderRadius: '3px',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: item.type === 'veg' ? '#22c55e' : '#ef4444',
                          }}
                        />
                      </span>
                    </td>
                    <td>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '48px', height: '36px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ width: '48px', height: '36px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{item.name}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || 'No description'}
                      </div>
                    </td>
                    <td>
                      {item.category && item.category !== 'Uncategorized' ? (
                        <span className="badge badge-neutral">{item.category}</span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          ⚠️ Needs Category (Hidden from POS)
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '800', fontSize: 'var(--font-base)', color: 'var(--text-primary)' }}>
                      {formatCurrency(item.price)}
                    </td>
                    <td>
                      {portionInfo.recipeFound ? (
                        portionInfo.portionsAvailable > 10 ? (
                          <span className="badge badge-success">
                            {portionInfo.portionsAvailable} Portions
                          </span>
                        ) : portionInfo.portionsAvailable > 0 ? (
                          <span className="badge badge-warning">
                            {portionInfo.portionsAvailable} Left
                          </span>
                        ) : (
                          <span className="badge badge-danger">Out of Stock</span>
                        )
                      ) : (
                        <span className="badge badge-neutral">No BOM</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{item.station}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {item.prepTime} mins
                    </td>
                    <td>
                      <button
                        className={`badge ${item.isAvailable !== false ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => handleToggleStock(item.id)}
                        title="Click to toggle 86 / In Stock"
                      >
                        {item.isAvailable !== false ? '● In Stock' : '✕ 86 / Sold Out'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Dish"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenDelete(item)}
                          title="Delete Dish"
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

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingItem ? 'Edit Menu Dish' : 'Add New Menu Dish'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Dish Title</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Bohra Dum Biryani (Handi)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Dish Image URL (Link)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
                {formData.image && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={formData.image}
                      alt="Preview"
                      style={{ width: '60px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Live Thumbnail Preview</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Dietary Classification</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="non-veg">Non-Vegetarian (Red Dot)</option>
                    <option value="veg">Vegetarian (Green Dot)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Estimated Food Cost (₹)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Preparation Kitchen Station</label>
                  <select
                    className="input"
                    value={formData.station}
                    onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  >
                    <option value="Tandoor">Tandoor Section</option>
                    <option value="Curry / Biryani">Curry / Biryani Handi</option>
                    <option value="Desserts & Beverages">Desserts & Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="label">Target Prep Time (Minutes)</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Dish Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Menu Item'}
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
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>
              Delete Dish
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong> from the active menu?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
