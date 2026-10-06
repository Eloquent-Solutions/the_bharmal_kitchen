/**
 * Order History Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Real-time order history, search, filters, receipt printing, and CSV export.
 * Directly connected to Firestore & local storage database.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { getOrders } from '../../services/dataService';
import { startOrderListener, stopOrderListener } from '../../services/realtimeOrderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Initial fetch from dataService
    setOrders(getOrders());

    // Listen in real-time
    startOrderListener(
      (realtimeOrders) => {
        if (realtimeOrders && realtimeOrders.length > 0) {
          setOrders(realtimeOrders);
        }
      },
      { viewRole: 'owner', soundEnabled: false }
    );

    const handleLocalOrderChange = () => {
      setOrders(getOrders());
    };
    const handleStorageChange = (e) => {
      if (e.key === 'tbk_orders') setOrders(getOrders());
    };

    window.addEventListener('tbk_order_changed', handleLocalOrderChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      stopOrderListener();
      window.removeEventListener('tbk_order_changed', handleLocalOrderChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    const cust = o.customer || o.customerName || '';
    const tbl = o.table || '';
    const oid = o.id || '';
    const matchesSearch =
      oid.toLowerCase().includes(search.toLowerCase()) ||
      cust.toLowerCase().includes(search.toLowerCase()) ||
      tbl.toLowerCase().includes(search.toLowerCase());

    const orderStatus = (o.status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      orderStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handlePrint = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    toast.success(`Printing thermal receipt for Order #${order.orderNumber || order.id}...`);
    window.print();
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Type', 'Table', 'Items Count', 'Total (INR)', 'Payment Status', 'Status'];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.createdAt || o.date || Date.now()).toLocaleString(),
      `"${o.customer || o.customerName || 'Walk-in'}"`,
      o.orderType || 'Dine-in',
      o.table || 'N/A',
      o.items?.length || o.itemsCount || 1,
      o.total || 0,
      o.paymentStatus || 'paid',
      o.status || 'completed',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TBK_Order_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Order history exported to CSV successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Order History & Audit</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Search, review, reprint receipts, and track past sales transactions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search by order ID, customer, table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
            />
          </div>

          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px', height: '38px' }}
          >
            <option value="all">All Statuses</option>
            <option value="received">Received / Incoming</option>
            <option value="cooking">Cooking</option>
            <option value="cooked">Cooked / Ready</option>
            <option value="completed">Completed / Served</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Showing <strong>{filteredOrders.length}</strong> orders
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date & Time</th>
                <th>Guest</th>
                <th>Type</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isCompleted = ['completed', 'cooked', 'served', 'ready'].includes((order.status || '').toLowerCase());
                const isCancelled = (order.status || '').toLowerCase() === 'cancelled';
                const isCooking = (order.status || '').toLowerCase() === 'cooking';

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '700' }}>#{order.orderNumber || order.id}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      {formatDateTime(order.createdAt || order.date || Date.now())}
                    </td>
                    <td>{order.customer || order.customerName || 'Walk-in Guest'}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {(order.orderType || 'Dine-in').replace('_', ' ')} {order.table ? `(${order.table})` : ''}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-sm)' }}>
                      {order.items?.length || order.itemsCount || 1} items
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                      {formatCurrency(order.total || 0)}
                    </td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                        {order.paymentMethod || (order.paymentStatus === 'paid' ? 'Paid' : 'Pending')}
                      </span>
                    </td>
                    <td>
                      {isCompleted ? (
                        <span className="badge badge-success">Completed</span>
                      ) : isCancelled ? (
                        <span className="badge badge-danger">Cancelled</span>
                      ) : isCooking ? (
                        <span className="badge badge-warning">🔥 Cooking</span>
                      ) : (
                        <span className="badge badge-neutral">{order.status || 'Received'}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handlePrint(order.id)}
                          title="Reprint Bill / Thermal Slip"
                        >
                          <Printer size={15} />
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
    </div>
  );
}
