/**
 * Supplier Management Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD for suppliers with contact info and outstanding balance.
 */

import { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import {
  getSuppliers,
  saveSupplier,
  deleteSupplier,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    category: 'General',
    outstandingBalance: 0,
    notes: '',
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setSuppliers(getSuppliers());
  };

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '', category: 'General', outstandingBalance: 0, notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditing(s);
    setFormData({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gstNumber: s.gstNumber || '',
      category: s.category || 'General',
      outstandingBalance: s.outstandingBalance || 0,
      notes: s.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (s) => {
    setToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    const payload = {
      ...(editing || {}),
      ...formData,
      name: formData.name.trim(),
      outstandingBalance: Number(formData.outstandingBalance) || 0,
    };

    const updated = saveSupplier(payload);
    setSuppliers(updated);
    setIsModalOpen(false);
    toast.success(editing ? 'Supplier updated!' : 'New supplier added!');
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const updated = deleteSupplier(toDelete.id);
    setSuppliers(updated);
    setIsDeleteModalOpen(false);
    setToDelete(null);
    toast.success('Supplier removed');
  };

  const filtered = suppliers.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || '').includes(search)
  );

  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  const CATEGORY_OPTIONS = ['General', 'Meat & Poultry', 'Vegetables & Fruits', 'Spices & Dry Goods', 'Dairy', 'Beverages', 'Packaging', 'Equipment', 'Cleaning Supplies'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Supplier Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Manage suppliers, contacts, and payable balances.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <Truck size={20} style={{ color: 'var(--color-primary)', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{suppliers.length}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Active Suppliers</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <IndianRupee size={20} style={{ color: 'var(--color-warning)', marginBottom: '4px' }} />
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>₹{totalOutstanding.toLocaleString()}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Outstanding</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input type="text" className="input" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '36px', height: '38px' }} />
        </div>
      </div>

      {/* Supplier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
        {filtered.map((s) => (
          <div className="card" key={s.id} style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: 'var(--font-lg)' }}>{s.name}</div>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>{s.category || 'General'}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-icon" onClick={() => handleOpenEdit(s)}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => handleOpenDelete(s)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>

            {s.contactPerson && (
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                Contact: <strong>{s.contactPerson}</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
              {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {s.phone}</div>}
              {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {s.email}</div>}
              {s.address && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {s.address}</div>}
              {s.gstNumber && <div>GST: {s.gstNumber}</div>}
            </div>

            {(s.outstandingBalance || 0) > 0 && (
              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: 'var(--font-sm)', fontWeight: '700', color: 'var(--color-danger)' }}>
                Outstanding: ₹{(s.outstandingBalance || 0).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Truck size={32} style={{ margin: '0 auto 8px' }} />
          <p>No suppliers found. Add your first supplier.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              {editing ? 'Edit Supplier' : 'Add Supplier'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Supplier / Company Name *</label>
                <input type="text" required className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Contact Person</label>
                  <input type="text" className="input" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className="input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Address</label>
                <input type="text" className="input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">GST Number</label>
                  <input type="text" className="input" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Outstanding Balance (₹)</label>
                  <input type="number" min="0" className="input" value={formData.outstandingBalance} onChange={(e) => setFormData({ ...formData, outstandingBalance: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>Remove Supplier</h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Delete <strong>{toDelete?.name}</strong>? This action cannot be undone.
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
