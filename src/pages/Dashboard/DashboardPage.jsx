/**
 * Dashboard Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Role-Aware 100% Dynamic Live Dashboard connected to Firestore / DataService layer:
 * - Chef: Live Order Queue, Station distribution, Cooking timers, Stock alerts.
 * - Cashier: Active orders, table status, channel dispatch, open tickets.
 * - Owner: Live revenue from orders, table turnover, expense breakdown, and gross profit.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import {
  IndianRupee,
  ShoppingCart,
  ChefHat,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Percent,
  CreditCard,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Flame,
  Eye,
  Bike,
  ShoppingBag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getRawMaterials,
  getOrders,
  getTables,
  getStaff,
  getExpenses,
  getKitchenStations,
  getMenuItems,
} from '../../services/dataService';
import { formatCurrency, formatTime } from '../../utils/formatters';
import './DashboardPage.css';

const CATEGORY_PALETTE = ['#c8a97e', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function DashboardPage() {
  const { userProfile, role } = useAuth();
  const [timeRange, setTimeRange] = useState('all'); // 'today', 'week', 'month', 'all'

  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stations, setStations] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_order_changed', handleSync);
    window.addEventListener('tbk_tables_updated', handleSync);
    window.addEventListener('tbk_raw_materials_updated', handleSync);
    window.addEventListener('tbk_expenses_updated', handleSync);
    window.addEventListener('tbk_menu_items_updated', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_order_changed', handleSync);
      window.removeEventListener('tbk_tables_updated', handleSync);
      window.removeEventListener('tbk_raw_materials_updated', handleSync);
      window.removeEventListener('tbk_expenses_updated', handleSync);
      window.removeEventListener('tbk_menu_items_updated', handleSync);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setTables(getTables());
    setRawMaterials(getRawMaterials());
    setExpenses(getExpenses());
    setStations(getKitchenStations());
    setMenuItems(getMenuItems());
  };

  const greeting = getGreeting();
  const displayName = userProfile?.displayName || 'there';
  const isChef = role === ROLES.CHEF || role === ROLES.KITCHEN_STAFF;
  const isCashier = role === ROLES.CASHIER;
  const isOwner = role === ROLES.OWNER || role === ROLES.ADMIN || !role;

  // Filter orders and expenses by date range
  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (timeRange === 'all') return true;
    if (!o.createdAt) return true;
    const orderDate = new Date(o.createdAt);
    if (timeRange === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= oneWeekAgo;
    }
    if (timeRange === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (timeRange === 'all') return true;
    if (!e.date) return true;
    const expDate = new Date(e.date);
    if (timeRange === 'today') {
      return expDate.toDateString() === now.toDateString();
    }
    if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return expDate >= oneWeekAgo;
    }
    if (timeRange === 'month') {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Dynamic Metrics
  const lowStockMaterials = rawMaterials.filter((m) => (m.currentStock || 0) <= (m.reorderLevel || 10));
  const activeOrders = filteredOrders.filter((o) => o.status === 'received' || o.status === 'cooking');
  const readyOrders = filteredOrders.filter((o) => o.status === 'ready');
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed' || o.paymentStatus === 'paid');
  const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0;
  const grossProfit = Math.max(0, totalSales - totalExpenseAmount);

  // Dynamic Category Sales from actual order items
  const itemCategoryMap = {};
  menuItems.forEach((m) => {
    itemCategoryMap[m.id] = m.category || 'Mains & Biryanis';
    itemCategoryMap[m.name] = m.category || 'Mains & Biryanis';
  });

  const categoryAgg = {};
  filteredOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const catName = item.category || itemCategoryMap[item.id] || itemCategoryMap[item.name] || 'Mains & Biryanis';
      const itemSubtotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      categoryAgg[catName] = (categoryAgg[catName] || 0) + itemSubtotal;
    });
  });

  const categoryKeys = Object.keys(categoryAgg);
  const categorySalesData = categoryKeys.length > 0
    ? categoryKeys.map((key, i) => ({
        name: key,
        value: categoryAgg[key],
        color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      }))
    : [{ name: 'Mains & Biryanis', value: totalSales || 1, color: '#c8a97e' }];

  // Dynamic Sales Velocity Curve
  const hourlyAgg = {
    '10 AM': 0,
    '12 PM': 0,
    '02 PM': 0,
    '04 PM': 0,
    '06 PM': 0,
    '08 PM': 0,
    '10 PM': 0,
  };

  filteredOrders.forEach((o) => {
    if (!o.createdAt) return;
    const hour = new Date(o.createdAt).getHours();
    const amount = Number(o.total) || 0;
    if (hour < 11) hourlyAgg['10 AM'] += amount;
    else if (hour < 13) hourlyAgg['12 PM'] += amount;
    else if (hour < 15) hourlyAgg['02 PM'] += amount;
    else if (hour < 17) hourlyAgg['04 PM'] += amount;
    else if (hour < 19) hourlyAgg['06 PM'] += amount;
    else if (hour < 21) hourlyAgg['08 PM'] += amount;
    else hourlyAgg['10 PM'] += amount;
  });

  const velocityData = Object.keys(hourlyAgg).map((h) => ({
    hour: h,
    sales: hourlyAgg[h],
  }));

  // Payment Breakdown
  const paymentMethodsAgg = {};
  filteredOrders.forEach((o) => {
    const pm = o.paymentMethod || 'UPI Online';
    const cleanMethod = pm.toLowerCase().includes('upi')
      ? 'UPI Online'
      : pm.toLowerCase().includes('cash')
      ? 'Cash'
      : pm.toLowerCase().includes('smart card') || pm.toLowerCase().includes('nfc')
      ? 'NFC Smart Card'
      : 'Card / POS';
    paymentMethodsAgg[cleanMethod] = (paymentMethodsAgg[cleanMethod] || 0) + (Number(o.total) || 0);
  });

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            {greeting}, {displayName.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            {isChef
              ? 'Kitchen Operations & Live Order Queue (Chef Station View)'
              : isCashier
              ? 'Cashier Counter & Order Dispatch Overview'
              : 'Executive Overview — Live Financials, POS Sales & Real-Time Operations'}
          </p>
        </div>
        {isOwner && (
          <div className="dashboard-header-actions">
            <div className="dashboard-date-filter">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ].map((range) => (
                <button
                  key={range.id}
                  className={`btn btn-sm ${timeRange === range.id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTimeRange(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CHEF DASHBOARD (NO FINANCIALS) ── */}
      {isChef && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="dashboard-stats">
            <StatCard
              icon={<ChefHat size={22} />}
              iconBg="rgba(245, 166, 35, 0.15)"
              iconColor="var(--color-warning)"
              label="Active KOTs"
              value={`${activeOrders.length} Tickets`}
              change="Cooking in Kitchen"
              positive
            />
            <StatCard
              icon={<Utensils size={22} />}
              iconBg="rgba(91, 147, 245, 0.15)"
              iconColor="var(--color-info)"
              label="Ready for Pickup"
              value={`${readyOrders.length} Orders`}
              change="Bump to Complete"
              positive
            />
            <StatCard
              icon={<CheckCircle size={22} />}
              iconBg="rgba(78, 203, 113, 0.15)"
              iconColor="var(--color-success)"
              label="Served / Done"
              value={`${completedOrders.length} Orders`}
              change="Dispatched from Kitchen"
              positive
            />
            <StatCard
              icon={<AlertTriangle size={22} />}
              iconBg="rgba(239, 68, 68, 0.15)"
              iconColor="var(--color-danger)"
              label="Low Stock Alert"
              value={`${lowStockMaterials.length} Items`}
              change="Reorder Needed"
              positive={false}
            />
          </div>

          <div className="dashboard-charts">
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Live Kitchen Stations ({stations.length})</h3>
                <span className="badge badge-warning">Active Shifts</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                {stations.map((stn) => (
                  <div key={stn.id} style={{ padding: 'var(--space-3)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700' }}>{stn.name}</span>
                      <span className="badge badge-info">Active</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stn.desc || 'Assigned station'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Stock Reorder Alerts</h3>
                <span className="badge badge-danger">{lowStockMaterials.length} Low</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockMaterials.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                    All raw materials in safe stock levels!
                  </p>
                ) : (
                  lowStockMaterials.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700' }}>{m.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Reorder at {m.reorderLevel} {m.unit}</div>
                      </div>
                      <span style={{ fontWeight: '800', color: 'var(--color-danger)', fontSize: '13px' }}>
                        {m.currentStock} {m.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CASHIER DASHBOARD ── */}
      {isCashier && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="dashboard-stats">
            <StatCard
              icon={<ShoppingCart size={22} />}
              iconBg="rgba(91, 147, 245, 0.15)"
              iconColor="var(--color-info)"
              label="Total Orders"
              value={String(filteredOrders.length)}
              change="POS + Online"
              positive
            />
            <StatCard
              icon={<Utensils size={22} />}
              iconBg="rgba(200, 169, 126, 0.15)"
              iconColor="var(--color-primary)"
              label="Occupied Tables"
              value={`${tables.filter((t) => t.status === 'occupied').length} / ${tables.length}`}
              change="Dine-in Floor"
              positive
            />
            <StatCard
              icon={<CheckCircle size={22} />}
              iconBg="rgba(78, 203, 113, 0.15)"
              iconColor="var(--color-success)"
              label="Dispatched"
              value={String(completedOrders.length)}
              change="Billed & Settled"
              positive
            />
            <StatCard
              icon={<Clock size={22} />}
              iconBg="rgba(245, 166, 35, 0.15)"
              iconColor="var(--color-warning)"
              label="Active in Kitchen"
              value={String(activeOrders.length)}
              change="Cooking Now"
              positive
            />
          </div>
        </div>
      )}

      {/* ── OWNER DASHBOARD (FULL LIVE FINANCIALS) ── */}
      {isOwner && (
        <>
          <div className="dashboard-stats">
            <StatCard
              icon={<IndianRupee size={22} />}
              iconBg="rgba(200, 169, 126, 0.15)"
              iconColor="var(--color-primary)"
              label="Live POS Revenue"
              value={formatCurrency(totalSales)}
              change={`${filteredOrders.length} total orders`}
              positive
            />
            <StatCard
              icon={<ShoppingCart size={22} />}
              iconBg="rgba(91, 147, 245, 0.15)"
              iconColor="var(--color-info)"
              label="Total Orders"
              value={String(filteredOrders.length)}
              change={`${activeOrders.length} currently active`}
              positive
            />
            <StatCard
              icon={<IndianRupee size={22} />}
              iconBg="rgba(78, 203, 113, 0.15)"
              iconColor="var(--color-success)"
              label="Avg Order Value"
              value={formatCurrency(avgOrderValue)}
              change="Per ticket average"
              positive
            />
            <StatCard
              icon={<TrendingUp size={22} />}
              iconBg="rgba(200, 169, 126, 0.15)"
              iconColor="var(--color-primary)"
              label="Net Operating Profit"
              value={formatCurrency(grossProfit)}
              change={`Expenses: ${formatCurrency(totalExpenseAmount)}`}
              positive
            />
          </div>

          {/* Mini Status Cards */}
          <div className="dashboard-order-status">
            <MiniStatCard icon={<Clock size={18} />} label="Received Orders" value={String(filteredOrders.filter((o) => o.status === 'received').length)} color="var(--color-warning)" />
            <MiniStatCard icon={<ChefHat size={18} />} label="In Kitchen" value={String(activeOrders.length)} color="var(--color-info)" />
            <MiniStatCard icon={<CheckCircle size={18} />} label="Ready / Completed" value={String(completedOrders.length)} color="var(--color-success)" />
            <MiniStatCard icon={<Utensils size={18} />} label="Floor Tables" value={`${tables.filter((t) => t.status === 'occupied').length} Occupied`} color="var(--color-primary)" />
          </div>

          {/* Charts Row */}
          <div className="dashboard-charts">
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Sales Velocity Curve</h3>
                <span className="badge badge-primary">Live Database</span>
              </div>
              <div className="dashboard-chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={velocityData}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8a97e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#c8a97e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="hour" stroke="#6e6a82" fontSize={11} />
                    <YAxis stroke="#6e6a82" fontSize={11} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20,20,50,0.95)',
                        border: '1px solid rgba(200,169,126,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f0ece4',
                      }}
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#c8a97e" strokeWidth={2.5} fill="url(#salesGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Sales by Category</h3>
                <span className="badge badge-neutral">{categorySalesData.length} Categories</span>
              </div>
              <div className="dashboard-chart-body">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categorySalesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categorySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20,20,50,0.95)',
                        border: '1px solid rgba(200,169,126,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f0ece4',
                      }}
                      formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {categorySalesData.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                        {item.name}
                      </span>
                      <span style={{ fontWeight: '700' }}>{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders & Payment Mix */}
          <div className="dashboard-recent-grid">
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Recent Live Orders</h3>
                <span className="badge badge-info">{filteredOrders.slice(0, 5).length} Latest</span>
              </div>
              <div className="table-container" style={{ padding: 0 }}>
                <table className="table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Type / Table</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>#{o.id}</td>
                        <td>{o.table ? `Table: ${o.table}` : o.orderType?.toUpperCase()}</td>
                        <td>{o.customer || 'Guest'}</td>
                        <td style={{ fontWeight: '700' }}>{formatCurrency(o.total)}</td>
                        <td>
                          <span
                            className={`badge ${
                              o.status === 'ready'
                                ? 'badge-success'
                                : o.status === 'cooking'
                                ? 'badge-warning'
                                : o.status === 'completed'
                                ? 'badge-secondary'
                                : 'badge-info'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                          No orders in this period yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>Payment Methods Mix</h3>
                <span className="badge badge-success">Settled</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
                {Object.keys(paymentMethodsAgg).length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    No payment data recorded yet.
                  </p>
                ) : (
                  Object.keys(paymentMethodsAgg).map((method) => {
                    const val = paymentMethodsAgg[method];
                    const percent = totalSales > 0 ? Math.round((val / totalSales) * 100) : 0;
                    return (
                      <div key={method}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600' }}>{method}</span>
                          <span style={{ fontWeight: '700' }}>{formatCurrency(val)} ({percent}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percent}%`, background: 'var(--color-primary)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, change, positive }) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="dashboard-stat-content">
        <span className="dashboard-stat-label">{label}</span>
        <span className="dashboard-stat-value">{value}</span>
        <div className="dashboard-stat-change">
          {positive ? (
            <ArrowUpRight size={14} className="positive" />
          ) : (
            <ArrowDownRight size={14} className="negative" />
          )}
          <span className={positive ? 'positive' : 'negative'}>{change}</span>
        </div>
      </div>
    </div>
  );
}

function MiniStatCard({ icon, label, value, color }) {
  return (
    <div className="dashboard-mini-card">
      <div className="dashboard-mini-icon" style={{ color }}>
        {icon}
      </div>
      <div>
        <div className="dashboard-mini-value">{value}</div>
        <div className="dashboard-mini-label">{label}</div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
