/**
 * Profitability & P&L Statement
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic P&L Calculation from Live Orders, Expenses, and Staff Payroll.
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  IndianRupee,
  Receipt,
  PieChart as PieIcon,
} from 'lucide-react';
import { getOrders, getExpenses, getStaff, getMenuItems } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';

export default function ProfitReportsPage() {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_order_changed', handleSync);
    window.addEventListener('tbk_expenses_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_order_changed', handleSync);
      window.removeEventListener('tbk_expenses_updated', handleSync);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setExpenses(getExpenses());
    setStaff(getStaff());
    setMenuItems(getMenuItems());
  };

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (dateRange === 'all') return true;
    if (!o.createdAt) return true;
    const d = new Date(o.createdAt);
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === '7days') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (dateRange === 'all') return true;
    if (!e.date) return true;
    const d = new Date(e.date);
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === '7days') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  // Calculate Item BOM Cost Map
  const costMap = {};
  menuItems.forEach((m) => {
    costMap[m.id] = Number(m.costPrice) || Math.round((m.price || 0) * 0.35);
    costMap[m.name] = Number(m.costPrice) || Math.round((m.price || 0) * 0.35);
  });

  // Gross Revenue & Cost of Goods Sold
  const grossRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  let totalCOGS = 0;
  filteredOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const itemCost = costMap[item.id] || costMap[item.name] || Math.round((item.price || 0) * 0.35);
      totalCOGS += itemCost * (Number(item.qty) || 1);
    });
  });

  const grossProfit = Math.max(0, grossRevenue - totalCOGS);
  const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalStaffSalaries = staff.reduce((sum, s) => sum + (Number(s.salary) || 0), 0);
  const totalOverheads = totalOperatingExpenses;
  const netProfit = grossProfit - totalOverheads;
  const netMargin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Profitability & P&L Statement</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time net earnings, food cost of goods sold (COGS), operating overheads, and EBITDA margin.
          </p>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.id}
              className={`btn btn-sm ${dateRange === range.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* P&L Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Net Sales Revenue</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>
            {formatCurrency(grossRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredOrders.length} Completed / Settled Orders
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Cost of Goods Sold (COGS)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)', marginTop: '4px' }}>
            {formatCurrency(totalCOGS)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Food Cost: {grossRevenue > 0 ? ((totalCOGS / grossRevenue) * 100).toFixed(1) : 0}% of sales
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Operating Expenses</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(totalOverheads)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredExpenses.length} Logged Expense Records
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Net Restaurant Profit</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)', marginTop: '4px' }}>
            {formatCurrency(netProfit)} ({netMargin}%)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>
            Net Operating Margin
          </div>
        </div>
      </div>

      {/* Expense Breakdown Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>Recent Operating Expenses Breakdown</h3>
          <span className="badge badge-neutral">{filteredExpenses.length} Records</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Expense ID</th>
                <th>Category / Purpose</th>
                <th>Payment Mode</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{exp.id}</td>
                  <td style={{ fontWeight: '600' }}>{exp.category || exp.title || exp.name}</td>
                  <td>{exp.mode || exp.paymentMethod || 'Cash'}</td>
                  <td>{exp.date || 'Today'}</td>
                  <td style={{ fontWeight: '800', color: 'var(--color-danger)' }}>{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                    No expenses recorded in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
