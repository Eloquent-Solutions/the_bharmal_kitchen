import { useState, useEffect } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Search,
  Bike,
  UtensilsCrossed,
  ShoppingBag,
  MoreVertical,
  XCircle,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Navigation,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  getOrders,
  saveOrder,
  deleteOrder,
  updateOrderStatus,
  assignOrder,
  getMenuItems,
  getTables,
} from '../../services/dataService';
import { playSwiggyZomatoTone } from '../../services/notificationService';
import { startOrderListener, stopOrderListener } from '../../services/realtimeOrderService';
import { formatCurrency, formatTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tablesList, setTablesList] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [assignmentType, setAssignmentType] = useState('delivery');
  const [assigneeName, setAssigneeName] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Edit / Add Order Modal state
  const [editingOrder, setEditingOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    customer: '',
    table: '',
    orderType: 'dine_in',
    status: 'cooking',
    items: [],
  });

  useEffect(() => {
    refreshData();
    startOrderListener(
      (realtimeOrders) => {
        if (realtimeOrders && realtimeOrders.length > 0) {
          setOrders(realtimeOrders);
        }
      },
      { viewRole: 'pos', soundEnabled: false }
    );

    const handleOrderChange = () => {
      setOrders(getOrders());
    };
    const handleTablesChange = () => {
      setTablesList(getTables());
    };
    const handleStorageChange = (e) => {
      if (e.key === 'tbk_orders') setOrders(getOrders());
      if (e.key === 'tbk_tables') setTablesList(getTables());
    };

    window.addEventListener('tbk_order_changed', handleOrderChange);
    window.addEventListener('tbk_tables_updated', handleTablesChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      stopOrderListener();
      window.removeEventListener('tbk_order_changed', handleOrderChange);
      window.removeEventListener('tbk_tables_updated', handleTablesChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setMenuItems(getMenuItems());
    setTablesList(getTables());
  };

  const filteredOrders = orders.filter((o) => {
    const matchesTab = activeTab === 'all' || o.orderType === activeTab || o.status === activeTab;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer && o.customer.toLowerCase().includes(search.toLowerCase())) ||
      (o.table && o.table.toLowerCase().includes(search.toLowerCase())) ||
      (o.deliveryPartner && o.deliveryPartner.toLowerCase().includes(search.toLowerCase())) ||
      (o.captain && o.captain.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleStatusUpdate = (orderId, newStatus) => {
    const updated = updateOrderStatus(orderId, newStatus);
    setOrders(updated);
    toast.success(`Order #${orderId} marked as ${newStatus.toUpperCase()}`);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleDeleteOrder = (orderId) => {
    if (window.confirm(`Are you sure you want to cancel and delete Order #${orderId}?`)) {
      const updated = deleteOrder(orderId);
      setOrders(updated);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      toast.success(`Order #${orderId} cancelled & deleted`);
    }
  };

  const handleOpenAssignModal = (order) => {
    setAssigningOrder(order);
    setDeliveryInstructions(order.deliveryInstructions || order.notes || '');
    if (order.orderType === 'delivery') {
      setAssignmentType('delivery');
      setAssigneeName(order.deliveryPartner || 'Direct Delivery Rider (Raju)');
    } else {
      setAssignmentType('captain');
      setAssigneeName(order.captain || 'Captain Shabbir');
    }
  };

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!assigningOrder) return;

    const payload =
      assignmentType === 'delivery'
        ? { deliveryPartner: assigneeName, deliveryInstructions: deliveryInstructions.trim(), captain: assigneeName }
        : { captain: assigneeName, deliveryInstructions: deliveryInstructions.trim() };

    const updated = assignOrder(assigningOrder.id, payload);
    setOrders(updated);
    toast.success(`Assigned #${assigningOrder.id} to ${assigneeName} with instructions!`);
    setAssigningOrder(null);
  };

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setEditFormData({
      customer: order.customer || '',
      table: order.table || (tablesList.length > 0 ? tablesList[0].name : ''),
      orderType: order.orderType || 'dine_in',
      status: order.status || 'cooking',
      items: order.items ? [...order.items] : [],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.customer.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const total = editFormData.items.reduce((sum, itm) => sum + (itm.price * (itm.qty || 1)), 0);

    const payload = {
      ...editingOrder,
      customer: editFormData.customer.trim(),
      table: editFormData.orderType === 'dine_in' ? editFormData.table : null,
      orderType: editFormData.orderType,
      status: editFormData.status,
      items: editFormData.items,
      total: total > 0 ? total : editingOrder.total,
    };

    const updated = saveOrder(payload);
    setOrders(updated);
    setIsEditModalOpen(false);
    toast.success(`Order #${editingOrder.id} updated successfully!`);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'dine_in':
        return <UtensilsCrossed size={16} className="text-secondary" />;
      case 'delivery':
        return <Bike size={16} className="text-info" />;
      default:
        return <ShoppingBag size={16} className="text-primary" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return <span className="badge badge-info">Received</span>;
      case 'cooking':
        return <span className="badge badge-warning">In Kitchen</span>;
      case 'ready':
        return <span className="badge badge-success">Ready to Serve</span>;
      case 'completed':
        return <span className="badge badge-secondary">Completed</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Active Live Orders & Billing Dispatch</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Real-time feed. Cashier can add, edit, cancel orders, and assign to delivery partners or captains.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <span className="badge badge-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            ● {orders.length} Active Orders
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'dine_in', label: 'Dine-In' },
            { id: 'takeaway', label: 'Takeaway' },
            { id: 'delivery', label: 'Delivery' },
            { id: 'cooking', label: 'Cooking Now' },
            { id: 'ready', label: 'Ready' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search order #, guest, table, rider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: order.status === 'ready' ? '4px solid var(--color-success)' : order.status === 'cooking' ? '4px solid var(--color-warning)' : '4px solid var(--color-info)',
            }}
          >
            <div>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontWeight: '800', fontSize: 'var(--font-lg)', color: 'var(--color-primary)' }}>
                      #{order.id}
                    </span>
                    {getTypeIcon(order.orderType)}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {order.table ? `Table: ${order.table}` : order.orderType?.toUpperCase()} • {order.customer}
                  </div>
                </div>
                {getStatusBadge(order.status)}
              </div>

              {/* Assignment Badges (Delivery Partner or Captain) */}
              <div style={{ margin: '6px 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {order.deliveryPartner ? (
                  <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <Bike size={12} /> {order.deliveryPartner}
                  </span>
                ) : null}
                {order.captain ? (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <UserCheck size={12} /> {order.captain}
                  </span>
                ) : null}
              </div>

              {/* Delivery Address & Customer Phone */}
              {order.deliveryAddress && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                  <strong>📍 Address:</strong> {order.deliveryAddress}
                  {order.phone && <span style={{ marginLeft: '6px', color: 'var(--color-primary)' }}>📞 {order.phone}</span>}
                </div>
              )}

              {/* Captain GPS Live Navigation Button */}
              {order.customerLocation?.googleMapsUrl && (
                <a
                  href={order.customerLocation.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: 'rgba(78, 203, 113, 0.15)',
                    border: '1px solid var(--color-success)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    marginBottom: '6px',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <Navigation size={12} /> 🧭 Open GPS Route in Google Maps
                </a>
              )}

              {/* Delivery Instructions to Captain / Rider */}
              {order.deliveryInstructions && (
                <div style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                  <strong>🛵 Rider Note:</strong> {order.deliveryInstructions}
                </div>
              )}

              {/* Items List */}
              <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: 'var(--space-2) 0', margin: 'var(--space-2) 0' }}>
                {order.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-sm)', padding: '3px 0' }}>
                    <span>
                      <strong style={{ color: 'var(--color-primary)' }}>{item.qty}x</strong> {item.name}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Time & Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {order.elapsedMinutes || 10} mins ago
                </span>
                <span style={{ fontSize: 'var(--font-base)', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Total: {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* Quick Actions Footer for Cashier / Billing */}
            <div style={{ display: 'flex', gap: '6px', marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
              {order.status === 'received' && (
                <button
                  className="btn btn-warning btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleStatusUpdate(order.id, 'cooking')}
                >
                  <ChefHat size={14} /> Send Kitchen
                </button>
              )}
              {order.status === 'cooking' && (
                <button
                  className="btn btn-success btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleStatusUpdate(order.id, 'ready')}
                >
                  <CheckCircle2 size={14} /> Mark Ready
                </button>
              )}
              {order.status === 'ready' && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => handleStatusUpdate(order.id, 'completed')}
                >
                  Settle Bill
                </button>
              )}

              {/* Assign to Rider or Captain */}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenAssignModal(order)}
                title="Assign Delivery Partner or Captain"
                disabled={order.status === 'completed'}
              >
                <UserCheck size={14} /> Assign
              </button>

              {/* Edit Order */}
              <button
                className="btn-icon"
                onClick={() => handleOpenEdit(order)}
                title="Edit Order"
              >
                <Edit2 size={14} />
              </button>

              {/* Cancel / Delete Order */}
              <button
                className="btn-icon"
                onClick={() => handleDeleteOrder(order.id)}
                title="Cancel / Delete Order"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Partner / Captain Modal */}
      {assigningOrder && (
        <div className="modal-backdrop" onClick={() => setAssigningOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              Assign Order #{assigningOrder.id}
            </h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
              Channel: <strong>{assigningOrder.orderType?.toUpperCase()}</strong> • Customer: {assigningOrder.customer}
            </p>

            <form onSubmit={handleSaveAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Assignment Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${assignmentType === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAssignmentType('delivery');
                      setAssigneeName('Direct Delivery Rider (Raju)');
                    }}
                  >
                    <Bike size={14} /> Delivery Partner
                  </button>
                  <button
                    type="button"
                    className={`btn ${assignmentType === 'captain' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAssignmentType('captain');
                      setAssigneeName('Captain Shabbir');
                    }}
                  >
                    <UserCheck size={14} /> Captain / Waiter
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Select Assignee</label>
                {assignmentType === 'delivery' ? (
                  <select
                    className="input"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                  >
                    <option value="Direct Delivery Rider (Raju)">Direct Delivery Rider (Raju)</option>
                    <option value="Direct Delivery Rider (Mustaqeem)">Direct Delivery Rider (Mustaqeem)</option>
                    <option value="Swiggy Partner Fleet">Swiggy Partner Fleet</option>
                    <option value="Zomato Partner Fleet">Zomato Partner Fleet</option>
                    <option value="Dunzo Express">Dunzo Express</option>
                    <option value="Shadowfax Courier">Shadowfax Courier</option>
                  </select>
                ) : (
                  <select
                    className="input"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                  >
                    <option value="Captain Shabbir">Captain Shabbir (Floor Head)</option>
                    <option value="Captain Taher">Captain Taher (Section A)</option>
                    <option value="Captain Mufaddal">Captain Mufaddal (Section B)</option>
                    <option value="Waiter Ali">Waiter Ali</option>
                    <option value="Waiter Murtaza">Waiter Murtaza</option>
                  </select>
                )}
              </div>

              <div>
                <label className="label">
                  {assignmentType === 'delivery' ? 'Delivery Instructions for Captain / Rider' : 'Service Notes for Captain / Waiter'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder={
                    assignmentType === 'delivery'
                      ? 'e.g. Ring bell twice, gate code 402, keep handi upright in thermal bag, hand over directly to Mr. Khan'
                      : 'e.g. Extra napkins, serve starters first, royal thaal presentation'
                  }
                  style={{ fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAssigningOrder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Send Instructions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && editingOrder && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', marginBottom: '8px' }}>
              Edit Order #{editingOrder.id}
            </h3>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Customer Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={editFormData.customer}
                  onChange={(e) => setEditFormData({ ...editFormData, customer: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Channel</label>
                  <select
                    className="input"
                    value={editFormData.orderType}
                    onChange={(e) => setEditFormData({ ...editFormData, orderType: e.target.value })}
                  >
                    <option value="dine_in">Dine-in</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                {editFormData.orderType === 'dine_in' && (
                  <div>
                    <label className="label">Table</label>
                    {tablesList.length > 0 ? (
                      <select
                        className="input"
                        value={editFormData.table}
                        onChange={(e) => setEditFormData({ ...editFormData, table: e.target.value })}
                      >
                        {tablesList.map((t) => (
                          <option key={t.id || t.name} value={t.name}>
                            {t.name} ({t.capacity || t.seats || 4} seats)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input"
                        placeholder="Table name / number"
                        value={editFormData.table}
                        onChange={(e) => setEditFormData({ ...editFormData, table: e.target.value })}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Order Status</label>
                <select
                  className="input"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="received">Received</option>
                  <option value="cooking">Cooking in Kitchen</option>
                  <option value="ready">Ready to Serve</option>
                  <option value="completed">Completed & Settled</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
