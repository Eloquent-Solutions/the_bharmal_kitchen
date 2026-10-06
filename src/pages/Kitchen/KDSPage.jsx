/**
 * Kitchen Display System (KDS) Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Real-time order dispatch screen for chefs and kitchen staff:
 * - Live incoming orders with high-cadence Swiggy/Zomato audio alert
 * - Station filtering (Tandoor, Handi, Desserts, Salads)
 * - Add, Update, and Delete Kitchen Stations
 * - Cooking timer & elapsed time indicators
 * - Order status transitions (Received -> Cooking -> Ready -> Completed)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Flame,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  UtensilsCrossed,
} from 'lucide-react';
import {
  getOrders,
  updateOrderStatus,
  getKitchenStations,
  saveKitchenStation,
  deleteKitchenStation,
} from '../../services/dataService';
import {
  startOrderListener,
  stopOrderListener,
} from '../../services/realtimeOrderService';
import { playSwiggyZomatoTone } from '../../services/notificationService';
import { formatCurrency, formatTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function KDSPage() {
  const [orders, setOrders] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('All');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'cooking' | 'ready' | 'all'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Station Management Modal state
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);
  const [stationForm, setStationForm] = useState({ name: '', desc: '', printer: '' });

  useEffect(() => {
    refreshData();

    // Live clock ticker every 10s
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 10000);

    // Real-time Firestore order updates with Swiggy/Zomato sound chime
    startOrderListener(
      (updatedOrders) => {
        setOrders(updatedOrders);
      },
      { viewRole: 'chef', soundEnabled: true }
    );

    const handleDataUpdate = () => refreshData();
    window.addEventListener('storage', handleDataUpdate);

    return () => {
      clearInterval(clockTimer);
      stopOrderListener();
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setStations(getKitchenStations());
  };

  // Filter orders based on status & station
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter === 'active') {
        if (order.status === 'completed' || order.status === 'cancelled') return false;
      } else if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Station filter (if items match station)
      if (selectedStation !== 'All') {
        const matchesStation = (order.items || []).some((item) => {
          const itemStation = (item.station || '').toLowerCase();
          return itemStation.includes(selectedStation.toLowerCase()) || selectedStation.toLowerCase().includes(itemStation);
        });
        if (!matchesStation) return false;
      }

      return true;
    });
  }, [orders, statusFilter, selectedStation]);

  const handleStatusChange = (orderId, newStatus) => {
    updateOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (newStatus === 'cooking') toast.success(`Order #${orderId} moved to Cooking`);
    if (newStatus === 'ready') toast.success(`Order #${orderId} marked as Ready / Cooked!`);
    if (newStatus === 'completed') toast.success(`Order #${orderId} bumped / completed`);
  };

  const handleTestSound = () => {
    playSwiggyZomatoTone();
    toast('🔔 Swiggy / Zomato order alert chime triggered!', { icon: '🍲' });
  };

  // Station Management Handlers
  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationForm({ name: '', desc: '', printer: 'PRN-01' });
    setIsStationModalOpen(true);
  };

  const handleOpenEditStation = (stn) => {
    setEditingStation(stn);
    setStationForm({ name: stn.name, desc: stn.desc || '', printer: stn.printer || '' });
    setIsStationModalOpen(true);
  };

  const handleSaveStation = (e) => {
    e.preventDefault();
    if (!stationForm.name.trim()) {
      toast.error('Station name is required');
      return;
    }
    saveKitchenStation({
      ...(editingStation ? { id: editingStation.id } : {}),
      name: stationForm.name.trim(),
      desc: stationForm.desc.trim(),
      printer: stationForm.printer || null,
    });
    setStations(getKitchenStations());
    setIsStationModalOpen(false);
    toast.success(editingStation ? 'Kitchen station updated!' : 'New kitchen station created!');
  };

  const handleDeleteStation = (id, name) => {
    if (window.confirm(`Are you sure you want to delete station "${name}"?`)) {
      deleteKitchenStation(id);
      setStations(getKitchenStations());
      if (selectedStation === name) setSelectedStation('All');
      toast.success('Kitchen station removed');
    }
  };

  const getElapsedBadgeClass = (createdAt) => {
    if (!createdAt) return 'badge-neutral';
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (elapsed >= 25) return 'badge-danger';
    if (elapsed >= 15) return 'badge-warning';
    return 'badge-info';
  };

  const getElapsedTimeStr = (createdAt) => {
    if (!createdAt) return '5m ago';
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    return `${Math.max(1, elapsed)}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* ── Top Bar / KDS Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', padding: '10px', borderRadius: 'var(--radius-lg)' }}>
            <ChefHat size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Kitchen Display Screen (KDS)
              <span className="badge badge-success" style={{ fontSize: '11px', animation: 'pulse 2s infinite' }}>● LIVE</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-xs)' }}>
              Real-time incoming orders, ticket timers, and station cooking queues.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleTestSound} title="Test Sound Alert">
            <Volume2 size={15} style={{ color: 'var(--color-warning)' }} /> Test Chime
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleOpenAddStation}>
            <Plus size={14} /> Add Station
          </button>

          <div style={{ background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
            🕒 {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ── Filters & Station Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', background: 'var(--bg-card)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        {/* Stations Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', maxWidth: '100%' }}>
          <button
            className={`btn btn-sm ${selectedStation === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedStation('All')}
          >
            All Stations ({stations.length})
          </button>
          {stations.map((stn) => (
            <div key={stn.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                className={`btn btn-sm ${selectedStation === stn.name ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedStation(stn.name)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {stn.name}
              </button>
              <button
                className="btn-icon"
                onClick={() => handleOpenEditStation(stn)}
                title="Edit Station"
                style={{ width: '26px', height: '26px' }}
              >
                <Edit2 size={11} />
              </button>
              <button
                className="btn-icon"
                onClick={() => handleDeleteStation(stn.id, stn.name)}
                title="Delete Station"
                style={{ width: '26px', height: '26px', color: 'var(--color-danger)' }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'active', label: 'Active Queue' },
            { id: 'received', label: 'Incoming' },
            { id: 'cooking', label: 'Cooking' },
            { id: 'ready', label: 'Ready / Cooked' },
            { id: 'all', label: 'All' },
          ].map((f) => (
            <button
              key={f.id}
              className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(f.id)}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Orders Cards Grid ── */}
      {filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)' }}>
          <UtensilsCrossed size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
          <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>No Active Orders</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            New tickets created from POS or online website will appear here with an instant audio alert chime!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {filteredOrders.map((order) => {
            const isCooking = order.status === 'cooking';
            const isReady = order.status === 'ready';
            const isIncoming = order.status === 'received';

            return (
              <div
                key={order.id}
                className="card"
                style={{
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderTop: isReady
                    ? '4px solid var(--color-success)'
                    : isCooking
                    ? '4px solid var(--color-warning)'
                    : '4px solid var(--color-primary)',
                  boxShadow: isIncoming ? '0 0 12px rgba(200, 169, 126, 0.25)' : 'none',
                }}
              >
                {/* Header */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass-subtle)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 'var(--font-lg)', fontWeight: '900', color: 'var(--color-primary)' }}>
                        #{order.orderNumber || order.id}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                        {order.orderType === 'dine_in' ? `Dine-in (${order.table || 'T-01'})` : order.orderType}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {order.customer || 'Guest'} {order.captain ? `• ${order.captain}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`badge ${getElapsedBadgeClass(order.createdAt)}`} style={{ fontSize: '11px', fontWeight: '800' }}>
                      ⏱️ {getElapsedTimeStr(order.createdAt)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {formatTime(order.createdAt || new Date())}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: 'var(--font-base)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', padding: '1px 6px', fontSize: '12px' }}>
                            {item.qty || item.quantity || 1}x
                          </span>
                          <span>{item.name}</span>
                        </div>
                        {item.station && (
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '26px' }}>
                            📍 {item.station}
                          </span>
                        )}
                        {item.instructions && (
                          <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginLeft: '26px', fontStyle: 'italic' }}>
                            Note: {item.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {order.deliveryInstructions && (
                    <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--color-info)' }}>
                      🛵 Rider: {order.deliveryInstructions}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-glass-subtle)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 'var(--space-2)' }}>
                  {order.status === 'received' && (
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontWeight: '700', fontSize: '12px' }}
                      onClick={() => handleStatusChange(order.id, 'cooking')}
                    >
                      <Flame size={14} /> Start Cooking
                    </button>
                  )}

                  {order.status === 'cooking' && (
                    <button
                      className="btn btn-success"
                      style={{ flex: 1, fontWeight: '700', fontSize: '12px' }}
                      onClick={() => handleStatusChange(order.id, 'ready')}
                    >
                      <CheckCircle2 size={14} /> Mark Ready / Cooked
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontWeight: '700', fontSize: '12px' }}
                      onClick={() => handleStatusChange(order.id, 'completed')}
                    >
                      <Check size={14} /> Bump / Complete
                    </button>
                  )}

                  <button
                    className="btn-icon"
                    onClick={() => handleStatusChange(order.id, 'received')}
                    title="Reset to Incoming"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Station Modal ── */}
      {isStationModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsStationModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingStation ? 'Edit Kitchen Station' : 'Add Kitchen Station'}
              </h3>
              <button className="btn-icon" onClick={() => setIsStationModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveStation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Station Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Tandoor Section, Curry / Biryani Handi"
                  value={stationForm.name}
                  onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Description / Equipment</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="e.g. Clay charcoal tandoors for naan & kebabs"
                  value={stationForm.desc}
                  onChange={(e) => setStationForm({ ...stationForm, desc: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Assigned KOT Printer</label>
                <select
                  className="input"
                  value={stationForm.printer}
                  onChange={(e) => setStationForm({ ...stationForm, printer: e.target.value })}
                >
                  <option value="">None (Screen Only)</option>
                  <option value="PRN-01">PRN-01 (Main Kitchen Thermal 80mm)</option>
                  <option value="PRN-02">PRN-02 (Tandoor Section Printer)</option>
                  <option value="PRN-03">PRN-03 (Handi Cauldron Printer)</option>
                  <option value="PRN-04">PRN-04 (Beverage Bar Printer)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsStationModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStation ? 'Save Changes' : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
