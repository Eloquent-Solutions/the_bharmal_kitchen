/**
 * Order Analytics & Channel Performance
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic Channel Breakdown from Live Orders.
 */

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  UtensilsCrossed,
  Bike,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getOrders } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';

export default function OrderReportsPage() {
  const [orders, setOrders] = useState([]);
  const [dateRange, setDateRange] = useState('7days');

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
  };

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (dateRange === 'all') return true;
    if (!o.createdAt) return true;
    const orderDate = new Date(o.createdAt);
    if (dateRange === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= sevenDaysAgo;
    }
    if (dateRange === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const dineInOrders = filteredOrders.filter((o) => o.orderType === 'dine_in');
  const takeawayOrders = filteredOrders.filter((o) => o.orderType === 'takeaway');
  const deliveryOrders = filteredOrders.filter((o) => o.orderType === 'delivery');

  const dineInRevenue = dineInOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const takeawayRevenue = takeawayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const deliveryRevenue = deliveryOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Weekly Channel Data
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const channelDayMap = {
    Mon: { day: 'Mon', dineIn: 0, takeaway: 0, delivery: 0 },
    Tue: { day: 'Tue', dineIn: 0, takeaway: 0, delivery: 0 },
    Wed: { day: 'Wed', dineIn: 0, takeaway: 0, delivery: 0 },
    Thu: { day: 'Thu', dineIn: 0, takeaway: 0, delivery: 0 },
    Fri: { day: 'Fri', dineIn: 0, takeaway: 0, delivery: 0 },
    Sat: { day: 'Sat', dineIn: 0, takeaway: 0, delivery: 0 },
    Sun: { day: 'Sun', dineIn: 0, takeaway: 0, delivery: 0 },
  };

  filteredOrders.forEach((o) => {
    if (!o.createdAt) return;
    const d = new Date(o.createdAt);
    const dayName = daysOfWeek[d.getDay()];
    if (channelDayMap[dayName]) {
      if (o.orderType === 'dine_in') channelDayMap[dayName].dineIn += 1;
      else if (o.orderType === 'takeaway') channelDayMap[dayName].takeaway += 1;
      else if (o.orderType === 'delivery') channelDayMap[dayName].delivery += 1;
    }
  });

  const channelChartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => channelDayMap[d]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Order Volume & Channel Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Breakdown of Dine-In covers, Takeaway pickups, and Delivery dispatch performance.
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

      {/* Channel KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Dine-In Covers</span>
            <UtensilsCrossed size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {dineInOrders.length} Orders
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Revenue: {formatCurrency(dineInRevenue)}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Takeaway Pickups</span>
            <ShoppingBag size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {takeawayOrders.length} Orders
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Revenue: {formatCurrency(takeawayRevenue)}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Home Deliveries</span>
            <Bike size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {deliveryOrders.length} Orders
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Revenue: {formatCurrency(deliveryRevenue)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', marginBottom: 'var(--space-3)' }}>
          Order Distribution by Channel ({dateRange === '7days' ? 'Last 7 Days' : dateRange.toUpperCase()})
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={channelChartData}>
              <XAxis dataKey="day" stroke="var(--text-tertiary)" />
              <YAxis stroke="var(--text-tertiary)" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="dineIn" name="Dine-In" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="takeaway" name="Takeaway" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivery" name="Delivery" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
