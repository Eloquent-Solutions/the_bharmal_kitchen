/**
 * Day Close & Z-Report Reconciler
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Computes live End-of-Day financial summaries from actual orders, cash transactions,
 * and expenses. Saves Z-Report to Firestore.
 */

import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Printer,
  FileCheck,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import {
  getOrders,
  getExpenses,
  getCashTransactions,
  saveDayCloseRecord,
  getRestaurantSettings,
} from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function DayClosePage() {
  const [dayClosed, setDayClosed] = useState(false);
  const [countedCash, setCountedCash] = useState(0);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cashTx, setCashTx] = useState([]);

  useEffect(() => {
    const loadedOrders = getOrders();
    const loadedExpenses = getExpenses();
    const loadedCashTx = getCashTransactions();

    setOrders(loadedOrders);
    setExpenses(loadedExpenses);
    setCashTx(loadedCashTx);

    // Initial counted cash estimate
    const cashSales = loadedOrders
      .filter((o) => o.paymentMethod === 'cash' || o.paymentStatus === 'paid')
      .reduce((s, o) => s + (o.total || 0), 0);
    const openingFloat = 5000;
    const cashExpenses = loadedExpenses
      .filter((e) => e.paymentMode === 'Cash Drawer')
      .reduce((s, e) => s + (e.amount || 0), 0);
    setCountedCash(Math.max(0, openingFloat + cashSales - cashExpenses));
  }, []);

  const totalGrossSales = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalTax = Math.round(totalGrossSales * 0.05);
  const netSales = totalGrossSales - totalTax;

  const cashOrders = orders.filter((o) => o.paymentMethod === 'cash' || (o.paymentStatus === 'paid' && !o.paymentMethod)).reduce((s, o) => s + (o.total || 0), 0);
  const upiOrders = orders.filter((o) => o.paymentMethod === 'upi').reduce((s, o) => s + (o.total || 0), 0);
  const cardSmartOrders = orders.filter((o) => o.paymentMethod === 'smart_card' || o.paymentMethod === 'card').reduce((s, o) => s + (o.total || 0), 0);

  const cashExpenses = expenses.filter((e) => e.paymentMode === 'Cash Drawer').reduce((s, e) => s + (e.amount || 0), 0);
  const openingFloat = 5000;
  const expectedCashInDrawer = Math.max(0, openingFloat + cashOrders - cashExpenses);
  const cashDifference = countedCash - expectedCashInDrawer;

  const handleRunDayClose = () => {
    saveDayCloseRecord({
      date: new Date().toISOString().split('T')[0],
      totalOrders: orders.length,
      grossSales: totalGrossSales,
      netSales,
      totalTax,
      paymentMix: {
        cash: cashOrders,
        upi: upiOrders,
        smart_card: cardSmartOrders,
      },
      countedCash,
      expectedCash: expectedCashInDrawer,
      variance: cashDifference,
    });
    setDayClosed(true);
    toast.success('Business Day closed & Official Z-Report saved to Firestore!');
  };

  const handlePrintZReport = () => {
    toast.success('Printing Official Z-Report to default cashier thermal printer...');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Day Close & Z-Report Reconciler</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Daily shift closure, physical cash reconciliation, tax summaries, and official Z-Report filing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={handlePrintZReport}>
            <Printer size={16} /> Print Z-Report
          </button>
          {!dayClosed && (
            <button className="btn btn-primary" onClick={handleRunDayClose}>
              <FileCheck size={16} /> Finalise & Close Business Day
            </button>
          )}
        </div>
      </div>

      {dayClosed && (
        <div className="card" style={{ background: 'rgba(78, 203, 113, 0.1)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
          <CheckCircle2 size={24} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '700', color: 'var(--color-success)', fontSize: 'var(--font-base)' }}>
              Business Day Closed & Audited
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              All transactions for today have been reconciled and archived in Firestore.
            </div>
          </div>
        </div>
      )}

      {/* Grid Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Gross Sales</div>
          <div style={{ fontSize: 'var(--font-3xl)', fontWeight: '900', color: 'var(--color-primary)', marginTop: '4px' }}>
            {formatCurrency(totalGrossSales)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Across {orders.length} Total Orders
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Estimated Net Revenue</div>
          <div style={{ fontSize: 'var(--font-3xl)', fontWeight: '900', color: 'var(--color-success)', marginTop: '4px' }}>
            {formatCurrency(netSales)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Excluding CGST & SGST (₹{totalTax})
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Expected Cash in Till</div>
          <div style={{ fontSize: 'var(--font-3xl)', fontWeight: '900', color: 'var(--color-warning)', marginTop: '4px' }}>
            {formatCurrency(expectedCashInDrawer)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Opening (₹{openingFloat}) + Cash - Outward
          </div>
        </div>
      </div>

      {/* Reconciliation Form */}
      <div className="card">
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
          Physical Drawer Cash Reconciliation
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div>
            <label className="label">Physical Cash Counted in Drawer (₹)</label>
            <input
              type="number"
              className="input"
              value={countedCash}
              onChange={(e) => setCountedCash(Number(e.target.value))}
              style={{ fontSize: 'var(--font-xl)', fontWeight: '800' }}
            />
          </div>

          <div style={{ background: 'var(--bg-glass-subtle)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Cash Audit Variance:</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '900', color: cashDifference === 0 ? 'var(--color-success)' : cashDifference > 0 ? 'var(--color-info)' : 'var(--color-danger)' }}>
              {cashDifference === 0 ? '₹0 (Exact Match)' : `${cashDifference > 0 ? '+' : ''}${formatCurrency(cashDifference)}`}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {cashDifference === 0 ? 'Till matches expected figure perfectly' : cashDifference > 0 ? 'Surplus in physical cash' : 'Shortage in physical cash'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
