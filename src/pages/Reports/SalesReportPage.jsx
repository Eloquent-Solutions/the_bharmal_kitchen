/**
 * Sales Analytics & Reports
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic Revenue Analytics from Live Orders.
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  UtensilsCrossed,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getOrders, getRestaurantSettings, getMenuItems } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState('7days');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_order_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_order_changed', handleSync);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setMenuItems(getMenuItems());
  };

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (dateRange === 'all') return true;
    if (!o.createdAt) return true;
    const orderDate = new Date(o.createdAt);
    if (dateRange === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return orderDate.toDateString() === yesterday.toDateString();
    }
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= sevenDaysAgo;
    }
    if (dateRange === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= thirtyDaysAgo;
    }
    return true;
  });

  const settings = getRestaurantSettings();
  const cgstRate = Number(settings.cgstRate || 2.5);
  const sgstRate = Number(settings.sgstRate || 2.5);
  const totalTaxRate = cgstRate + sgstRate;

  const netRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrders = filteredOrders.length;
  const aov = totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0;
  const gstCollected = Math.round((netRevenue * totalTaxRate) / (100 + totalTaxRate));
  const cgstCollected = Math.round(gstCollected / 2);
  const sgstCollected = gstCollected - cgstCollected;

  // Daily Trend calculation
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyMap = {
    Mon: { day: 'Mon', revenue: 0, orders: 0 },
    Tue: { day: 'Tue', revenue: 0, orders: 0 },
    Wed: { day: 'Wed', revenue: 0, orders: 0 },
    Thu: { day: 'Thu', revenue: 0, orders: 0 },
    Fri: { day: 'Fri', revenue: 0, orders: 0 },
    Sat: { day: 'Sat', revenue: 0, orders: 0 },
    Sun: { day: 'Sun', revenue: 0, orders: 0 },
  };

  filteredOrders.forEach((o) => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt);
    const dayName = daysOfWeek[d.getDay()];
    if (dailyMap[dayName]) {
      dailyMap[dayName].revenue += Number(o.total) || 0;
      dailyMap[dayName].orders += 1;
    }
  });

  const dailyTrendData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => dailyMap[d]);

  // Category share calculation
  const itemCategoryMap = {};
  menuItems.forEach((m) => {
    itemCategoryMap[m.id] = m.category || 'Mains & Biryanis';
    itemCategoryMap[m.name] = m.category || 'Mains & Biryanis';
  });

  const catAgg = {};
  filteredOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const cat = item.category || itemCategoryMap[item.id] || itemCategoryMap[item.name] || 'Mains & Biryanis';
      const itemSubtotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      catAgg[cat] = (catAgg[cat] || 0) + itemSubtotal;
    });
  });

  const catKeys = Object.keys(catAgg);
  const categoryShareData = catKeys.length > 0
    ? catKeys.map((k, idx) => ({
        name: k,
        value: catAgg[k],
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
    : [{ name: 'Mains & Biryanis', value: netRevenue || 1, color: '#f59e0b' }];

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export for this date range');
      return;
    }
    const headers = ['Order ID', 'Date', 'Type', 'Customer', 'Items Count', 'Total (INR)', 'Payment Method', 'Status'];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A',
      o.orderType || 'dine_in',
      `"${o.customer || 'Guest'}"`,
      (o.items || []).length,
      o.total || 0,
      `"${o.paymentMethod || 'UPI Online'}"`,
      o.status || 'received',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TBK_Sales_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales report exported to CSV successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Sales Analytics & Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Live revenue trends, channel performance, and tax analytics derived directly from POS orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <FileSpreadsheet size={16} /> Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: '7days', label: 'Last 7 Days' },
          { id: '30days', label: 'Last 30 Days' },
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Net Sales Revenue</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
            {formatCurrency(netRevenue)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-success)', marginTop: '4px' }}>
            Live POS & Customer Portal
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Orders Placed</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {totalOrders}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-success)', marginTop: '4px' }}>
            {filteredOrders.filter((o) => o.status === 'completed' || o.paymentStatus === 'paid').length} Settled
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Average Order Value (AOV)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {formatCurrency(aov)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Per ticket average
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total GST Collected</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {formatCurrency(gstCollected)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            CGST: {formatCurrency(cgstCollected)} | SGST: {formatCurrency(sgstCollected)}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Sales Trend Chart */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
            Daily Revenue Trend
          </h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="var(--text-tertiary)" />
                <YAxis stroke="var(--text-tertiary)" tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Revenue']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
            Revenue by Menu Category
          </h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryShareData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Sales']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
