/**
 * Cash Drawer & Petty Cash Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD for Cash In / Out transactions with direct sync to Firestore.
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Lock,
  History,
} from 'lucide-react';
import {
  getCashTransactions,
  saveCashTransaction,
} from '../../services/dataService';
import { formatCurrency, formatTime, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CashDrawerPage() {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('in'); // 'in' | 'out'
  const [form, setForm] = useState({ reason: '', amount: '' });

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  const refreshData = () => {
    setTransactions(getCashTransactions());
  };

  const totalIn = transactions.filter((t) => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalOut = transactions.filter((t) => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);
  const currentBalance = totalIn - totalOut;

  const handleOpenModal = (type) => {
    setModalType(type);
    setForm({ reason: '', amount: '' });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || !form.reason.trim()) {
      toast.error('Valid reason and positive amount required');
      return;
    }

    saveCashTransaction({
      type: modalType,
      reason: form.reason.trim(),
      amount,
      cashier: 'Current User',
    });

    setTransactions(getCashTransactions());
    setIsModalOpen(false);
    setForm({ reason: '', amount: '' });
    toast.success(modalType === 'in' ? 'Cash deposited to drawer' : 'Cash withdrawn / Petty expense recorded');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Cash Drawer & Petty Cash</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time physical till cash tracking, pay-ins, petty expenses, and till float balance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-success" onClick={() => handleOpenModal('in')}>
            <Plus size={16} /> Cash In (Float / Top-up)
          </button>
          <button className="btn btn-danger" onClick={() => handleOpenModal('out')}>
            <Minus size={16} /> Cash Out (Expense)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Current Drawer Balance</div>
          <div style={{ fontSize: 'var(--font-3xl)', fontWeight: '900', color: currentBalance >= 0 ? 'var(--color-primary)' : 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(currentBalance)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Live physical cash till in drawer
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Cash Inward</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)', marginTop: '4px' }}>
            {formatCurrency(totalIn)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Opening floats + cash orders + NFC recharges
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Cash Outward</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(totalOut)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Daily perishables & petty purchases
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass-subtle)', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: 'var(--font-base)' }}>
          Drawer Cash Movement Ledger
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Type</th>
                <th>Description / Reason</th>
                <th>Staff / Cashier</th>
                <th>Time</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No cash transactions recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{tx.id}</td>
                    <td>
                      {tx.type === 'in' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowUpRight size={12} /> Cash In
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowDownRight size={12} /> Cash Out
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '600' }}>{tx.reason}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{tx.cashier}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      {tx.time || formatTime(tx.timestamp || new Date())}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: tx.type === 'in' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {tx.type === 'in' ? `+${formatCurrency(tx.amount)}` : `-${formatCurrency(tx.amount)}`}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {modalType === 'in' ? 'Deposit Cash to Drawer' : 'Withdraw Cash / Petty Expense'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  required
                  placeholder="e.g. 500"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Reason / Justification</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder={modalType === 'in' ? 'e.g. Opening Float, Change Top-up' : 'e.g. Ice purchase, LPG delivery'}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={`btn ${modalType === 'in' ? 'btn-success' : 'btn-danger'}`}>
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
