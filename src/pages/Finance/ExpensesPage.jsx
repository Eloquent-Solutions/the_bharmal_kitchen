/**
 * Expenses Management Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD (Add, Edit, Filter, Delete) for Restaurant Operating Expenses.
 * Synced with Firestore.
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  Receipt,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import {
  getExpenses,
  saveExpense,
  deleteExpense,
} from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newExp, setNewExp] = useState({
    title: '',
    category: 'Kitchen Supplies',
    amount: '',
    paymentMode: 'Cash Drawer',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const refreshData = () => {
    setExpenses(getExpenses());
  };

  const categories = ['All', 'Kitchen Supplies', 'Vegetables & Perishables', 'Maintenance', 'Packaging', 'Utilities', 'Staff Welfare'];

  const filtered = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'All' || e.category === categoryFilter;
    const matchesSearch =
      (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalExpense = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExp.title.trim() || !newExp.amount || Number(newExp.amount) <= 0) {
      toast.error('Valid title and amount are required');
      return;
    }

    saveExpense({
      title: newExp.title.trim(),
      category: newExp.category,
      amount: Number(newExp.amount),
      paymentMode: newExp.paymentMode,
      date: newExp.date || new Date().toISOString().split('T')[0],
      recordedBy: 'Admin',
    });

    setExpenses(getExpenses());
    setIsModalOpen(false);
    setNewExp({
      title: '',
      category: 'Kitchen Supplies',
      amount: '',
      paymentMode: 'Cash Drawer',
      date: new Date().toISOString().split('T')[0],
    });
    toast.success('Expense recorded successfully!');
  };

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete expense "${title}"?`)) {
      deleteExpense(id);
      setExpenses(getExpenses());
      toast.success('Expense deleted');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Operating Expenses</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Track kitchen supplies, utility bills, packaging, APMC purchases, and operational overheads.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Record New Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Recorded Expenses</div>
          <div style={{ fontSize: 'var(--font-3xl)', fontWeight: '900', color: 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(totalExpense)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Across {filtered.length} expense items
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', maxWidth: '100%' }}>
          {categories.map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${categoryFilter === c ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoryFilter(c)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Date</th>
                <th>Expense Description</th>
                <th>Category</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No expenses found.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{e.id}</td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>{formatDate(e.date)}</td>
                    <td style={{ fontWeight: '600' }}>{e.title}</td>
                    <td>
                      <span className="badge badge-neutral">{e.category}</span>
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{e.paymentMode}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-danger)' }}>
                      {formatCurrency(e.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(e.id, e.title)}
                        title="Delete Expense"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Record New Expense</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Expense Title / Vendor Description</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Daily APMC Vegetables, LPG Commercial Cylinder"
                  value={newExp.title}
                  onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Expense Category</label>
                  <select
                    className="input"
                    value={newExp.category}
                    onChange={(e) => setNewExp({ ...newExp, category: e.target.value })}
                  >
                    <option value="Kitchen Supplies">Kitchen Supplies</option>
                    <option value="Vegetables & Perishables">Vegetables & Perishables</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Staff Welfare">Staff Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="label">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    required
                    placeholder="3500"
                    value={newExp.amount}
                    onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Payment Mode</label>
                  <select
                    className="input"
                    value={newExp.paymentMode}
                    onChange={(e) => setNewExp({ ...newExp, paymentMode: e.target.value })}
                  >
                    <option value="Cash Drawer">Cash Drawer</option>
                    <option value="UPI (GPay / PhonePe)">UPI (GPay / PhonePe)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={newExp.date}
                    onChange={(e) => setNewExp({ ...newExp, date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
