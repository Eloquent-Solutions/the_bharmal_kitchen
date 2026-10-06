/**
 * Customer Live Order Tracking & Google Maps Page
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Real-time order progress updates directly from Kitchen KDS:
 *  - Payment Verified
 *  - Kitchen Received
 *  - Cooking (with live timer)
 *  - Cooked & Ready
 *  - Direct Google Maps link to restaurant
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrders, RESTAURANT_INFO } from '../../services/dataService';
import { startOrderListener, stopOrderListener } from '../../services/realtimeOrderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Flame,
  MapPin,
  ExternalLink,
  Phone,
  ArrowLeft,
  Printer,
  ShoppingBag,
  Sparkles,
  Timer,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerTrackOrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [cookingElapsed, setCookingElapsed] = useState(0);

  useEffect(() => {
    const list = getOrders();
    setAllOrders(list);

    // Find requested order or pick the most recent
    let target = null;
    if (orderId) {
      target = list.find((o) => o.id === orderId || String(o.orderNumber) === orderId);
    }
    if (!target && list.length > 0) {
      target = list[0];
    }
    setOrder(target);

    // Subscribe to real-time updates from KDS
    startOrderListener(
      (realtimeOrders) => {
        if (realtimeOrders && realtimeOrders.length > 0) {
          setAllOrders(realtimeOrders);
          const currentId = target ? target.id : orderId;
          const updated = realtimeOrders.find((o) => o.id === currentId || String(o.orderNumber) === currentId);
          if (updated) {
            setOrder(updated);
          }
        }
      },
      { viewRole: 'pos', soundEnabled: true }
    );

    return () => stopOrderListener();
  }, [orderId]);

  // Live cooking timer tick
  useEffect(() => {
    if (!order?.cookingStartedAt) return;
    const interval = setInterval(() => {
      const start = new Date(order.cookingStartedAt).getTime();
      setCookingElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.cookingStartedAt]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Derive active step
  const statusStr = (order?.status || '').toLowerCase();
  const isCooking = statusStr === 'cooking';
  const isCooked = ['cooked', 'ready'].includes(statusStr);
  const isCompleted = ['completed', 'served'].includes(statusStr);

  const currentStepIndex =
    isCompleted ? 4 :
    isCooked ? 3 :
    isCooking ? 2 :
    1; // Received / Confirmed

  const STEPS = [
    { label: 'Payment Verified', desc: 'UPI settlement confirmed' },
    { label: 'Order Received', desc: 'KOT printed in kitchen' },
    { label: 'Chef is Cooking', desc: 'Handi & tandoor in progress' },
    { label: 'Cooked & Ready', desc: 'Packaged hot for service' },
    { label: 'Served / Completed', desc: 'Feast delivered' },
  ];

  if (!order) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>No Active Orders Found</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', maxWidth: '400px' }}>
          You don't have any pending orders. Treat yourself to our authentic Bohra Thaals and Mughlai kebabs!
        </p>
        <Link to="/order" className="btn btn-primary" style={{ marginTop: '20px' }}>
          Explore Menu & Order
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/order')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Menu
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print Receipt
            </button>
            <Link to="/order" className="btn btn-primary btn-sm">
              <ShoppingBag size={14} /> Order More
            </Link>
          </div>
        </div>

        {/* Status Header Card */}
        <div
          className="card"
          style={{
            padding: '24px',
            borderTop: isCompleted
              ? '4px solid #22c55e'
              : isCooked
              ? '4px solid #22c55e'
              : isCooking
              ? '4px solid var(--color-primary)'
              : '4px solid #d97706',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: '900' }}>
                  Order #{order.orderNumber || order.id}
                </span>
                <span className="badge badge-success">● UPI Paid</span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {order.orderType?.replace('_', ' ') || 'Dine-in'} {order.table ? `(${order.table})` : ''}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Placed on {formatDateTime(order.createdAt || Date.now())} • Guest: <strong>{order.customer}</strong>
              </div>
            </div>

            {/* Live Cooking Timer Display */}
            {isCooking && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'monospace',
                }}
              >
                <Flame size={18} style={{ color: '#d97706' }} />
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Cooking Time</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>
                    {formatTimer(cookingElapsed)}
                  </div>
                </div>
              </div>
            )}

            {isCooked && (
              <div style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', padding: '8px 14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800' }}>
                <CheckCircle2 size={18} /> Cooked & Ready!
              </div>
            )}
          </div>

          {/* Stepper Visualization */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', position: 'relative' }}>
              {STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        margin: '0 auto 8px',
                        background: isPassed ? 'var(--color-primary)' : 'var(--bg-glass-subtle)',
                        color: isPassed ? '#000' : 'var(--text-tertiary)',
                        border: isCurrent ? '2px solid #fff' : '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '13px',
                        boxShadow: isCurrent ? '0 0 12px rgba(245, 158, 11, 0.5)' : undefined,
                      }}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: isPassed ? '700' : '500', color: isPassed ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'none' }}>
                      {step.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Google Maps & Restaurant Location Card ── */}
        <div
          className="card"
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(200, 169, 126, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(200, 169, 126, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MapPin size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>The Bharmals Kitchen</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                  {RESTAURANT_INFO.address}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  <span>📞 {RESTAURANT_INFO.phone}</span>
                  <span>⏱️ {RESTAURANT_INFO.openingHours}</span>
                </div>
              </div>
            </div>

            {/* Direct Google Maps Action Button */}
            <a
              href={RESTAURANT_INFO.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '800',
                padding: '10px 18px',
                fontSize: '13px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              }}
            >
              <Navigation size={16} /> Open in Google Maps
            </a>
          </div>
        </div>

        {/* ── Order Breakdown / Bill Details ── */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBag size={16} style={{ color: 'var(--color-primary)' }} />
            Feast Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '13px',
                }}
              >
                <div>
                  <span style={{ fontWeight: '700', marginRight: '8px', color: 'var(--color-primary)' }}>
                    {item.qty || item.quantity || 1}×
                  </span>
                  <span>{item.name}</span>
                  {item.isCombo && (
                    <span className="badge badge-warning" style={{ fontSize: '9px', marginLeft: '6px' }}>
                      Thaal
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: '700' }}>
                  {formatCurrency((item.price || 0) * (item.qty || item.quantity || 1))}
                </div>
              </div>
            ))}
          </div>

          {/* Payment & Settlement Summary */}
          <div style={{ marginTop: '16px', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Payment Mode</span>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{order.paymentMethod || 'UPI Online'}</span>
            </div>
            {order.transactionId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>UPI Transaction Ref</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{order.transactionId}</span>
              </div>
            )}
            {order.deliveryAddress && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Delivery Address</span>
                <span style={{ color: 'var(--text-primary)', maxWidth: '300px', textAlign: 'right' }}>{order.deliveryAddress}</span>
              </div>
            )}
            {order.whatsappOptIn && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontSize: '11px', marginTop: '4px' }}>
                <span>📱 WhatsApp Alerts</span>
                <span>Active on {order.phone}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: '900',
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '2px solid var(--border-color)',
              }}
            >
              <span>Total Paid</span>
              <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(order.total || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
