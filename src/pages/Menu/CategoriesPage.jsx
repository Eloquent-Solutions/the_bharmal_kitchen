/**
 * Menu Categories Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD with Image Links, Kitchen Stations, and Head Chef / Owner Access.
 */

import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  MoveVertical,
  CheckCircle2,
  AlertTriangle,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import { getCategories, saveCategory, deleteCategory, getMenuItems } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catToDelete, setCatToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    defaultStation: 'Tandoor',
    sortOrder: 1,
    image: '',
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCategories(getCategories());
    setMenuItems(getMenuItems());
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormData({
      name: '',
      defaultStation: 'Tandoor',
      sortOrder: categories.length + 1,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name,
      defaultStation: cat.defaultStation,
      sortOrder: cat.sortOrder || 1,
      image: cat.image || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (cat) => {
    setCatToDelete(cat);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const payload = {
      ...(editingCat || {}),
      name: formData.name.trim(),
      defaultStation: formData.defaultStation,
      sortOrder: Number(formData.sortOrder) || 1,
      image: formData.image.trim(),
    };

    const updated = saveCategory(payload);
    setCategories(updated);
    setIsModalOpen(false);
    toast.success(editingCat ? 'Category updated successfully!' : 'New category created!');
  };

  const confirmDelete = () => {
    if (!catToDelete) return;
    const updated = deleteCategory(catToDelete.id);
    setCategories(updated);
    setIsDeleteModalOpen(false);
    setCatToDelete(null);
    toast.success('Category deleted successfully');
  };

  const toggleStatus = (cat) => {
    const updated = saveCategory({ ...cat, isActive: !cat.isActive });
    setCategories(updated);
    toast.success(`Category "${cat.name}" ${cat.isActive ? 'disabled' : 'enabled'}`);
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.defaultStation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Menu Categories</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Organize POS sections, food image banners from URL links, and station routing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Filter / Search */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Total Categories: <strong>{filtered.length}</strong>
        </div>
      </div>

      {/* Categories Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Order</th>
                <th>Image Banner</th>
                <th>Category Name</th>
                <th>Assigned Items</th>
                <th>Default Kitchen Station</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat) => {
                const assignedCount = menuItems.filter(
                  (i) => i.category === cat.name || i.categoryId === cat.id
                ).length;

                return (
                  <tr key={cat.id}>
                    <td style={{ color: 'var(--text-tertiary)', fontWeight: '700' }}>
                      #{cat.sortOrder}
                    </td>
                    <td>
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          style={{ width: '48px', height: '36px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ width: '48px', height: '36px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>
                      {cat.name}
                    </td>
                    <td>
                      <span className="badge badge-neutral">{assignedCount} Dishes</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{cat.defaultStation}</span>
                    </td>
                    <td>
                      <button
                        className={`badge ${cat.isActive !== false ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        onClick={() => toggleStatus(cat)}
                      >
                        {cat.isActive !== false ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(cat)}
                          title="Edit Category"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenDelete(cat)}
                          title="Delete Category"
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

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingCat ? 'Edit Category' : 'Create Category'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Category Title</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Seafood & Fish Delicacies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Category Image URL (Link)</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Default Kitchen Station</label>
                  <select
                    className="input"
                    value={formData.defaultStation}
                    onChange={(e) => setFormData({ ...formData, defaultStation: e.target.value })}
                  >
                    <option value="Tandoor">Tandoor Section</option>
                    <option value="Curry / Biryani">Curry / Biryani Handi</option>
                    <option value="Desserts & Beverages">Desserts & Beverages</option>
                    <option value="Cold / Salad Counter">Cold / Salad Counter</option>
                  </select>
                </div>
                <div>
                  <label className="label">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCat ? 'Save Changes' : 'Create Category'}
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
              Delete Category
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to remove <strong>{catToDelete?.name}</strong>?
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
