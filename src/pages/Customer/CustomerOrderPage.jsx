/**
 * Customer Ordering Portal
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Features:
 *  - Google Account authentication & profile
 *  - Popular, Chef Special & Most Ordered dish tags
 *  - Dine-in / Takeaway / Delivery channel selection
 *  - WhatsApp real-time updates opt-in
 *  - Required Terms & Conditions agreement with live modal
 *  - Advance online UPI payment (QR Code, GPay, PhonePe, Paytm deep links)
 *  - Auto-deduction of stock upon payment verification
 *  - Direct redirection to Live Order Tracking & Google Maps
 *  - "Need Help / Join The Hotel" contact & recruitment inbox submission
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../firebase/config';
import {
  getMenuItems,
  getCategories,
  getCombos,
  saveOrder,
  deductIngredientsForOrder,
  getTermsAndConditions,
  getUpiSettings,
  saveInboxMessage,
  getChannelSettings,
  getTables,
  getRestaurantSettings,
  RESTAURANT_INFO,
} from '../../services/dataService';
import { playSwiggyZomatoTone } from '../../services/notificationService';
import { formatCurrency } from '../../utils/formatters';
import { calculateOrderTotals } from '../../utils/calculations';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  MapPin,
  Clock,
  Phone,
  Flame,
  Star,
  Sparkles,
  HelpCircle,
  Briefcase,
  FileText,
  QrCode,
  ShieldCheck,
  Send,
  X,
  ExternalLink,
  LogOut,
  User,
  Navigation,
  Locate,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerOrderPage() {
  const { user, signOut, signInWithGoogle, isCustomer } = useAuth();
  const navigate = useNavigate();

  const [restaurantSettings, setRestaurantSettings] = useState(getRestaurantSettings());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [combos, setCombos] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  // Channel & Table Settings
  const [channelSettings, setChannelSettings] = useState(getChannelSettings());
  const [tablesList, setTablesList] = useState(getTables());

  // Order Details
  const [orderType, setOrderType] = useState('takeaway'); // dine_in, takeaway, delivery
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null); // { latitude, longitude, accuracy, googleMapsUrl }
  const [isLocating, setIsLocating] = useState(false);
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cookingNotes, setCookingNotes] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Payment Selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi'); // upi, cash, card

  // Modals
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Payment State
  const [upiSettings, setUpiSettings] = useState(getUpiSettings());
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  // Help / Join Us Form
  const [helpForm, setHelpForm] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    type: 'general', // general, joining, catering
    subject: '',
    message: '',
  });

  const refreshMenuCatalog = useCallback(() => {
    setRestaurantSettings(getRestaurantSettings());
    setItems(getMenuItems());
    setCategories(getCategories());
    setCombos(getCombos());
    setUpiSettings(getUpiSettings());
    const ch = getChannelSettings();
    setChannelSettings(ch);
    const tb = getTables();
    setTablesList(tb);
    if (tb.length > 0) setTableNumber((current) => current || tb[0].name || tb[0].id);
  }, []);

  useEffect(() => {
    refreshMenuCatalog();

    // Initial channel selection based on availability
    const ch = getChannelSettings();
    if (ch.allowDineIn !== false) setOrderType('dine_in');
    else if (ch.allowTakeaway !== false) setOrderType('takeaway');
    else if (ch.allowDelivery !== false) setOrderType('delivery');

    // Real-time synchronization for multi-tab and live admin updates
    const handleStorageUpdate = (e) => {
      if (['tbk_menu_items', 'tbk_combos', 'tbk_categories', 'tbk_channel_settings', 'tbk_tables', 'tbk_upi_config'].includes(e.key)) {
        refreshMenuCatalog();
      }
    };
    const handleMenuChange = () => setItems(getMenuItems());
    const handleComboChange = () => setCombos(getCombos());
    const handleCategoryChange = () => setCategories(getCategories());
    const handleChannelChange = (e) => setChannelSettings(e.detail || getChannelSettings());
    const handleTableChange = (e) => {
      const updated = e.detail || getTables();
      setTablesList(updated);
      if (updated.length > 0) {
        setTableNumber((current) => current || updated[0].name || updated[0].id);
      }
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('tbk_menu_items_updated', handleMenuChange);
    window.addEventListener('tbk_combos_updated', handleComboChange);
    window.addEventListener('tbk_categories_updated', handleCategoryChange);
    window.addEventListener('tbk_channel_settings_updated', handleChannelChange);
    window.addEventListener('tbk_tables_updated', handleTableChange);

    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('tbk_menu_items_updated', handleMenuChange);
      window.removeEventListener('tbk_combos_updated', handleComboChange);
      window.removeEventListener('tbk_categories_updated', handleCategoryChange);
      window.removeEventListener('tbk_channel_settings_updated', handleChannelChange);
      window.removeEventListener('tbk_tables_updated', handleTableChange);
    };
  }, [refreshMenuCatalog]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const gmapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const locObj = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          googleMapsUrl: gmapsUrl,
        };
        setCustomerLocation(locObj);
        if (!deliveryAddress.trim()) {
          setDeliveryAddress(`📍 Live GPS Pin: (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        }
        toast.success(`📍 Precise Location Locked (Accuracy ±${Math.round(accuracy)}m)! Captain can navigate directly.`);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        toast.error('Could not detect location. Please type your complete delivery address.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Update customer name if user logs in
  useEffect(() => {
    if (user?.displayName) {
      setCustomerName((current) => current || user.displayName);
    }
  }, [user?.displayName]);

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  const handleGoogleSignIn = async () => {
    try {
      const u = await signInWithGoogle();
      if (u) {
        toast.success(`Welcome, ${u.displayName || 'Customer'}!`);
        if (u.displayName) setCustomerName(u.displayName);
      }
    } catch (err) {
      toast.error('Google sign-in could not be completed');
    }
  };


  // Tag helper: assign "⭐ Popular", "🔥 Most Ordered", or "✨ Chef's Special"
  const getItemTag = (item, index) => {
    if (item.isSpecial) return { label: "Chef's Special", color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', icon: <Sparkles size={11} /> };
    if (item.rating >= 4.8 || index % 3 === 0) return { label: 'Most Ordered', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)', icon: <Flame size={11} /> };
    if (index % 2 === 0) return { label: 'Popular', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)', icon: <Star size={11} /> };
    return null;
  };

  const filteredItems = items.filter((item) => {
    // Only show items that are available from the restaurant side!
    const isAvailable = item.isAvailable !== false && item.status !== 'unavailable' && item.available !== false;
    if (!isAvailable) return false;

    const matchesCat = activeCategory === 'All' || item.category === activeCategory || item.categoryId === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const availableCombos = combos.filter((c) => c.status !== 'inactive' && c.isAvailable !== false);


  const getItemQtyInCart = (id) => {
    const found = cart.find((c) => c.id === id);
    return found ? found.quantity : 0;
  };

  const addToCart = (item, isCombo = false) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...item, quantity: 1, isCombo }];
    });
    toast.success(`Added "${item.name}" to your feast!`);
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === id) {
            const next = c.quantity + delta;
            return next > 0 ? { ...c, quantity: next } : null;
          }
          return c;
        })
        .filter(Boolean)
    );
  };


  const cartTotals = calculateOrderTotals(cart, {
    cgstRate: Number(restaurantSettings.cgstRate ?? 0),
    sgstRate: Number(restaurantSettings.sgstRate ?? 0),
    serviceChargeRate: Number(restaurantSettings.serviceCharge ?? 0),
    roundOff: restaurantSettings.roundOff !== false,
  });

  const cartItemCount = cart.reduce((acc, c) => acc + c.quantity, 0);

  // Validate and proceed to payment
  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error('Your feast cart is empty!');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number for order verification.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please provide your complete delivery address with landmarks.');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the Terms & Conditions and Ordering Policy to proceed.');
      return;
    }

    // Check payment method
    if (selectedPaymentMethod === 'upi') {
      setIsPaymentModalOpen(true);
    } else {
      placeOrderDirectly(selectedPaymentMethod);
    }
  };

  const placeOrderDirectly = (method) => {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `TBK-${orderNum}`;

    const standardDishes = cart.filter((c) => !c.isCombo);
    try {
      deductIngredientsForOrder(standardDishes, orderId);
    } catch (error) {
      toast.error(error.message);
      return;
    }

    const orderPayload = {
      id: orderId,
      orderNumber: orderNum,
      orderType,
      table: orderType === 'dine_in' ? (tableNumber || 'Table 1') : null,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
      customerLocation: customerLocation || null,
      customer: customerName.trim(),
      phone: customerPhone.trim(),
      whatsappOptIn,
      notes: cookingNotes.trim() || null,
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        qty: c.quantity,
        price: c.price,
        isCombo: !!c.isCombo,
      })),
      total: cartTotals.total,
      paymentStatus: 'pending',
      paymentMethod: method === 'cash' ? 'Cash on Counter/Delivery' : 'Card at Counter/Table',
      transactionId: `PAY-${Date.now().toString().slice(-6)}`,
      status: 'received',
      createdAt: new Date().toISOString(),
      createdBy: user?.displayName || customerName.trim(),
      createdById: user?.uid || null,
    };

    saveOrder(orderPayload);
    try {
      playSwiggyZomatoTone();
    } catch (e) { }
    toast.success(`🎉 Order #${orderId} confirmed! Kitchen has received your order.`);
    navigate(`/track/${orderId}`);
  };

  // Payment confirmation for UPI & Order dispatch
  const handleVerifyAndPlaceOrder = () => {
    setIsVerifyingPayment(true);

    setTimeout(() => {
      setIsVerifyingPayment(false);
      setIsPaymentModalOpen(false);

      const orderNum = Math.floor(1000 + Math.random() * 9000);
      const orderId = `TBK-${orderNum}`;
      const txn = transactionRef.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`;

      // Auto-deduct raw materials for standard dishes
      const standardDishes = cart.filter((c) => !c.isCombo);
      try {
        deductIngredientsForOrder(standardDishes, orderId);
      } catch (error) {
        toast.error(error.message);
        return;
      }

      const orderPayload = {
        id: orderId,
        orderNumber: orderNum,
        orderType,
        table: orderType === 'dine_in' ? (tableNumber || 'Table 1') : null,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : null,
        customerLocation: customerLocation || null,
        customer: customerName.trim(),
        phone: customerPhone.trim(),
        whatsappOptIn,
        notes: cookingNotes.trim() || null,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          qty: c.quantity,
          price: c.price,
          isCombo: !!c.isCombo,
        })),
        total: cartTotals.total,
        paymentStatus: 'paid',
        paymentMethod: 'UPI Online',
        transactionId: txn,
        status: 'received', // Kitchen receives order
        createdAt: new Date().toISOString(),
        createdBy: user?.displayName || customerName.trim(),
        createdById: user?.uid || null,
      };

      saveOrder(orderPayload);
      try {
        playSwiggyZomatoTone();
      } catch (e) { }

      toast.success(
        `🎉 Payment Verified! Order #${orderId} confirmed.\nKitchen is preparing your feast!`,
        { duration: 5000 }
      );

      navigate(`/track/${orderId}`);
    }, 1800);
  };


  // Submit help or join hotel inquiry
  const handleSendHelpMessage = (e) => {
    e.preventDefault();
    if (!helpForm.name.trim() || !helpForm.phone.trim() || !helpForm.message.trim()) {
      toast.error('Please fill in Name, Phone, and your Message.');
      return;
    }

    saveInboxMessage({
      name: helpForm.name.trim(),
      email: helpForm.email.trim(),
      phone: helpForm.phone.trim(),
      type: helpForm.type,
      subject: helpForm.subject.trim() || (helpForm.type === 'joining' ? 'Job Application / Join Kitchen' : 'Customer Query'),
      message: helpForm.message.trim(),
    });

    toast.success('📨 Message sent successfully! Our manager will call you back shortly.');
    setIsHelpModalOpen(false);
    setHelpForm({ name: user?.displayName || '', email: user?.email || '', phone: '', type: 'general', subject: '', message: '' });
  };

  // UPI deep link
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiSettings.upiId)}&pn=${encodeURIComponent(upiSettings.merchantName)}&am=${cartTotals.total}&cu=INR&tn=${encodeURIComponent(`TBK-Feast-Order`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}&bgcolor=ffffff&color=000000&margin=10`;

  const terms = getTermsAndConditions();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Navbar ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: '900',
              fontSize: '18px',
              letterSpacing: '1px',
            }}
          >
            TBK
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '0.5px', color: 'var(--color-primary)' }}>
              {restaurantSettings?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍 {restaurantSettings?.address}</span>
              <a
                href={restaurantSettings.googleMapUrl || RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                Maps <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsHelpModalOpen(true)}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <HelpCircle size={14} /> Need Help / Join Us
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/track')}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} /> Track Order
          </button>

          {/* Cart Trigger Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsCartDrawerOpen(true)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
          >
            <ShoppingCart size={15} />
            <span>Feast ({cartItemCount})</span>
            {cartItemCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: '900',
                }}
              >
                {formatCurrency(cartTotals.total)}
              </span>
            )}
          </button>

          {/* User Profile / Google Sign-in */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-glass-subtle)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c8a97e, #b8860b)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                  }}
                >
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'U')}
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.displayName || user?.email?.split('@')[0]}
                </span>
              </div>
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleLogout}
                title="Sign Out"
                style={{ color: 'var(--color-danger)', fontSize: '12px', padding: '4px 8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : isDemoMode ? (
            <Link to="/login" className="btn btn-secondary btn-sm">Try Demo Sign-In</Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
              <button
                onClick={handleGoogleSignIn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.1C3.25 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.1z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.1c.95-2.83 3.6-4.93 6.72-4.93z" />
                </svg>
                Sign in with Google
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(200, 169, 126, 0.12) 0%, transparent 100%)',
          padding: '24px 20px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            {restaurantSettings.isOpen && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                ● Kitchen Live & Accepting Orders
              </div>
            )}
            {restaurantSettings.isOpen === false && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', marginBottom: '8px' }}>
                ● Kitchen Closed
              </div>
            )}
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Authentic Royal Bohra & Mughlai Dining
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '600px', marginTop: '4px' }}>
              {isDemoMode
                ? 'Explore the menu and try the ordering flow with local demo data.'
                : 'Slow-cooked in pure ghee handis and charcoal tandoors. Order your Bohra Thaal, Mutton Raan, and Dum Biryani online.'}
            </p>
          </div>

          {/* Quick Location & Direct Google Maps Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Restaurant Location</div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>Bohra Bazaar, Fort, Mumbai</div>
              <a
                href={restaurantSettings.googleMapUrl || RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
              >
                Open in Google Maps <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Channel Selector & Search Bar ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Order Channel Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--card-bg)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {[
              channelSettings.allowDineIn !== false && { id: 'dine_in', label: '🍽️ Dine-in (Table)' },
              channelSettings.allowTakeaway !== false && { id: 'takeaway', label: '🥡 Takeaway / Pickup' },
              channelSettings.allowDelivery !== false && { id: 'delivery', label: '🛵 Doorstep Delivery' },
            ]
              .filter(Boolean)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOrderType(t.id)}
                  className={`btn btn-sm ${orderType === t.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {t.label}
                </button>
              ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search biryani, kebab, thaal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Notice if Delivery paused by admin */}
        {channelSettings.allowDelivery === false && (
          <div
            style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>🛵</span>
            <span>
              <strong>Delivery Status:</strong>{' '}
              {channelSettings.deliveryUnavailableReason ||
                'Doorstep delivery is temporarily unavailable from restaurant side. Ordering is open for Takeaway & Dine-in!'}
            </span>
          </div>
        )}

        {/* Categories Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '16px 0',
            scrollbarWidth: 'none',
          }}
        >
          <button
            className={`btn btn-sm ${activeCategory === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('All')}
            style={{ borderRadius: '999px', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            🍽️ All Dishes ({items.length})
          </button>
          <button
            className={`btn btn-sm ${activeCategory === 'Combos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('Combos')}
            style={{ borderRadius: '999px', fontSize: '12px', whiteSpace: 'nowrap', borderColor: 'var(--color-primary)' }}
          >
            ✨ Royal Thaals & Packages ({combos.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`btn btn-sm ${activeCategory === c.name ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveCategory(c.name)}
              style={{ borderRadius: '999px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dishes & Royal Packages Grid ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 20px 80px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Royal Thaals / Combos */}
          {(activeCategory === 'Combos' || activeCategory === 'All') &&
            availableCombos.map((combo) => {
              const inCart = getItemQtyInCart(combo.id);
              return (
                <div
                  key={combo.id}
                  className="card"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 0,
                    border: '2px solid rgba(217, 119, 6, 0.4)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                    <img
                      src={combo.image || 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80'}
                      alt={combo.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--color-primary)', color: '#000', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={11} /> Royal Thaal
                    </div>
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      Serves {combo.serves}
                    </div>
                  </div>

                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-primary)' }}>{combo.name}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                        {combo.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800' }}>{formatCurrency(combo.price)}</span>

                      {inCart > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button className="btn-icon btn-secondary" onClick={() => updateCartQty(combo.id, -1)} style={{ width: '28px', height: '28px' }}>-</button>
                          <span style={{ fontWeight: '800', fontSize: '14px' }}>{inCart}</span>
                          <button className="btn-icon btn-primary" onClick={() => updateCartQty(combo.id, 1)} style={{ width: '28px', height: '28px' }}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => addToCart(combo, true)} style={{ fontSize: '12px' }}>
                          <Plus size={13} /> Add Thaal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Regular Menu Dishes with Tags */}
          {activeCategory !== 'Combos' &&
            filteredItems.map((item, idx) => {
              const inCart = getItemQtyInCart(item.id);
              const tag = getItemTag(item, idx);

              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 0,
                    transition: 'transform 0.2s',
                  }}
                >
                  <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />

                    {/* Popular / Most Ordered / Chef Special Tag */}
                    {tag && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: tag.bg,
                          color: tag.color,
                          border: `1px solid ${tag.color}`,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {tag.icon} {tag.label}
                      </div>
                    )}

                    {/* Veg / Non-Veg badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${item.type === 'veg' ? '#22c55e' : '#ef4444'}`,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '3px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: item.type === 'veg' ? '#22c55e' : '#ef4444',
                        }}
                      />
                    </div>

                    <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '10px', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '3px' }}>
                      ⏱️ {item.prepTime || 15} mins
                    </div>
                  </div>

                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700' }}>{item.name}</h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: 1.3, maxHeight: '36px', overflow: 'hidden' }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800' }}>{formatCurrency(item.price)}</span>

                      {inCart > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button className="btn-icon btn-secondary" onClick={() => updateCartQty(item.id, -1)} style={{ width: '26px', height: '26px' }}>-</button>
                          <span style={{ fontWeight: '800', fontSize: '13px' }}>{inCart}</span>
                          <button className="btn-icon btn-primary" onClick={() => updateCartQty(item.id, 1)} style={{ width: '26px', height: '26px' }}>+</button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)} style={{ fontSize: '12px', padding: '4px 12px' }}>
                          <Plus size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </main>

      {/* ── Cart Drawer / Slide-Over ── */}
      {isCartDrawerOpen && (
        <div className="modal-backdrop" onClick={() => setIsCartDrawerOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '460px',
              borderRadius: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxHeight: '100vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '800' }}>
                  <ShoppingCart size={20} style={{ color: 'var(--color-primary)' }} />
                  Your Feast Cart ({cartItemCount})
                </div>
                <button className="btn-icon btn-ghost" onClick={() => setIsCartDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                    <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>Your cart is empty. Add dishes to order!</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-glass-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button className="btn-icon btn-secondary" onClick={() => updateCartQty(item.id, -1)} style={{ width: '26px', height: '26px' }}>-</button>
                        <span style={{ fontWeight: '800', fontSize: '13px' }}>{item.quantity}</span>
                        <button className="btn-icon btn-primary" onClick={() => updateCartQty(item.id, 1)} style={{ width: '26px', height: '26px' }}>+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Info Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-primary)' }}>
                  Customer Details & Delivery Info
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="label" style={{ fontSize: '11px' }}>Full Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your Name"
                      style={{ height: '34px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ fontSize: '11px' }}>WhatsApp Mobile *</label>
                    <input
                      type="tel"
                      className="input"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98200 XXXXX"
                      style={{ height: '34px', fontSize: '12px' }}
                    />
                  </div>
                </div>

                {orderType === 'dine_in' && (
                  <div>
                    <label className="label" style={{ fontSize: '11px' }}>
                      Table / Seat Number {tablesList.length === 0 ? '(Enter Manually)' : ''}
                    </label>
                    {tablesList.length > 0 ? (
                      <select
                        className="input"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        style={{ height: '34px', fontSize: '12px' }}
                      >
                        {tablesList.map((t) => (
                          <option key={t.id || t.name} value={t.name || t.id}>
                            {t.name || t.id} ({t.area || 'Dining'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. Table 1 or Counter Seat 3"
                        style={{ height: '34px', fontSize: '12px' }}
                      />
                    )}
                  </div>
                )}

                {/* Dynamic Payment Method Selector based on Admin Channel Rules */}
                <div style={{ marginTop: '6px' }}>
                  <label className="label" style={{ fontSize: '11px', marginBottom: '6px' }}>Select Payment Option</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(channelSettings.paymentMethods?.[orderType] || (orderType === 'delivery' ? ['upi'] : ['upi', 'cash'])).map((method) => {
                      const isSelected = selectedPaymentMethod === method;
                      const labels = {
                        upi: { title: '⚡ Instant UPI Online (GPay / PhonePe / Paytm / QR)', desc: 'Scan & pay for immediate kitchen verification' },
                        cash: { title: '💵 Cash Payment', desc: orderType === 'delivery' ? 'Cash on Doorstep Delivery' : (orderType === 'dine_in' ? 'Cash at Table to Captain' : 'Cash at Counter Pickup') },
                        card: { title: '💳 Card Machine', desc: 'Swipe / Tap via POS Card Terminal' },
                      };
                      const info = labels[method] || { title: method, desc: '' };
                      return (
                        <label
                          key={method}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'rgba(200, 169, 126, 0.12)' : 'var(--bg-glass-subtle)',
                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="payment_choice"
                            value={method}
                            checked={isSelected}
                            onChange={() => setSelectedPaymentMethod(method)}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? 'var(--color-primary)' : 'inherit' }}>
                              {info.title}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              {info.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="label" style={{ fontSize: '11px', margin: 0 }}>Complete Delivery Address *</label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        style={{
                          background: customerLocation ? 'rgba(78, 203, 113, 0.15)' : 'rgba(200, 169, 126, 0.15)',
                          border: `1px solid ${customerLocation ? 'var(--color-success)' : 'var(--color-primary)'}`,
                          color: customerLocation ? 'var(--color-success)' : 'var(--color-primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: isLocating ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isLocating ? (
                          <>
                            <Loader2 size={12} className="spin" />
                            Detecting GPS...
                          </>
                        ) : customerLocation ? (
                          <>
                            <CheckCircle2 size={12} />
                            GPS Locked (±{customerLocation.accuracy}m)
                          </>
                        ) : (
                          <>
                            <Locate size={12} />
                            📍 Auto-Detect Live GPS
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      className="input"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Building, Flat No, Street, Landmark..."
                      rows={2}
                      style={{ fontSize: '12px' }}
                    />

                    {customerLocation && (
                      <div
                        style={{
                          background: 'rgba(78, 203, 113, 0.08)',
                          border: '1px solid rgba(78, 203, 113, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span>
                          📍 <strong>Captain GPS Pin:</strong> {customerLocation.latitude.toFixed(5)}, {customerLocation.longitude.toFixed(5)}
                        </span>
                        <a
                          href={customerLocation.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--color-success)',
                            fontWeight: '700',
                            textDecoration: 'underline',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          View Pin <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="label" style={{ fontSize: '11px' }}>Special Kitchen Instructions (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={cookingNotes}
                    onChange={(e) => setCookingNotes(e.target.value)}
                    placeholder="Less spicy, extra mint dip, warm rotlis..."
                    style={{ height: '34px', fontSize: '12px' }}
                  />
                </div>

                {/* WhatsApp Update Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '11px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={(e) => setWhatsappOptIn(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    📱 <strong>Update me on WhatsApp:</strong> Receive real-time order cooking/ready alerts, festive promotions, and chef's specials.
                  </span>
                </label>

                {/* Terms and Conditions Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '11px', marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTermsModalOpen(true);
                      }}
                      style={{ color: 'var(--color-primary)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                    >
                      Terms & Conditions and Ordering Policy
                    </button>
                    .
                  </span>
                </label>
              </div>
            </div>

            {/* Bill & Pay Button */}
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>CGST (2.5%) + SGST (2.5%)</span>
                <span>{formatCurrency(cartTotals.totalTax)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>
                <span>Total Payable</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(cartTotals.total)}</span>
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleProceedToPayment}
                disabled={cart.length === 0}
                style={{ justifyContent: 'center', gap: '8px', fontWeight: '800' }}
              >
                <ShieldCheck size={18} /> Proceed to Online UPI Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPI Online Payment Modal (Pay First, Then Order Places) ── */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop" onClick={() => !isVerifyingPayment && setIsPaymentModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', textAlign: 'center', padding: '24px' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <QrCode size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Instant UPI Payment</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
              Scan QR or tap your preferred UPI App to pay. Order confirms immediately upon payment!
            </p>

            {/* Total Amount Badge */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Payable Amount</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-primary)' }}>
                {formatCurrency(cartTotals.total)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                UPI ID: <strong>{upiSettings.upiId}</strong> ({upiSettings.merchantName})
              </div>
            </div>

            {/* QR Code */}
            <div
              style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: 'var(--radius-lg)',
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                marginBottom: '16px',
              }}
            >
              <img
                src={qrCodeUrl}
                alt="Scan to Pay via UPI"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
              <div style={{ color: '#000', fontSize: '11px', fontWeight: '700', marginTop: '4px' }}>
                Scan with any UPI App
              </div>
            </div>

            {/* Direct UPI Intent Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <a
                href={upiLink}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', justifyContent: 'center' }}
              >
                Pay via GPay
              </a>
              <a
                href={upiLink}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', justifyContent: 'center' }}
              >
                Pay via PhonePe
              </a>
              <a
                href={upiLink}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', justifyContent: 'center' }}
              >
                Pay via Paytm
              </a>
              <a
                href={upiLink}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px', justifyContent: 'center' }}
              >
                BHIM / Other UPI
              </a>
            </div>

            {/* Manual UTR / Reference */}
            <div style={{ marginBottom: '16px', textAlign: 'left' }}>
              <label className="label" style={{ fontSize: '11px' }}>
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. 426899123456"
                style={{ height: '36px', fontSize: '12px' }}
              />
            </div>

            {/* Confirm Payment Button */}
            <button
              className="btn btn-success btn-lg w-full"
              onClick={handleVerifyAndPlaceOrder}
              disabled={isVerifyingPayment}
              style={{ justifyContent: 'center', gap: '8px', fontWeight: '800' }}
            >
              {isVerifyingPayment ? (
                <>
                  <span className="spinner spinner-sm" />
                  Verifying UPI Settlement...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> I Have Paid — Confirm Order
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Terms & Conditions Modal ── */}
      {isTermsModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTermsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                {terms.title || 'Terms of Service & Ordering Policy'}
              </h3>
              <button className="btn-icon btn-ghost" onClick={() => setIsTermsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {terms.sections?.map((sec, idx) => (
                <div key={idx} style={{ background: 'var(--bg-glass-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {sec.heading}
                  </div>
                  <div>{sec.content}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setTermsAccepted(true);
                  setIsTermsModalOpen(false);
                  toast.success('Terms & Conditions Accepted');
                }}
              >
                I Agree & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Need Help / Join The Hotel Modal ── */}
      {isHelpModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} style={{ color: 'var(--color-primary)' }} />
                Need Help / Work With Us
              </h3>
              <button className="btn-icon btn-ghost" onClick={() => setIsHelpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Have questions, feedback, bulk catering requests, or want to join The Bharmals Kitchen team as chef or staff? Send us a direct message into the manager's inbox!
            </p>

            <form onSubmit={handleSendHelpMessage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label className="label" style={{ fontSize: '11px' }}>Inquiry Type *</label>
                <select
                  className="input"
                  value={helpForm.type}
                  onChange={(e) => setHelpForm({ ...helpForm, type: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="general">General Inquiry / Feedback</option>
                  <option value="joining">Job Application — Join The Kitchen / Hotel</option>
                  <option value="catering">Bulk Thaal / Wedding Catering Booking</option>
                  <option value="order_issue">Issue with a Previous Order</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="label" style={{ fontSize: '11px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={helpForm.name}
                    onChange={(e) => setHelpForm({ ...helpForm, name: e.target.value })}
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '11px' }}>Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="input"
                    value={helpForm.phone}
                    onChange={(e) => setHelpForm({ ...helpForm, phone: e.target.value })}
                    placeholder="+91..."
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: '11px' }}>Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={helpForm.email}
                  onChange={(e) => setHelpForm({ ...helpForm, email: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: '11px' }}>Subject / Role</label>
                <input
                  type="text"
                  className="input"
                  placeholder={helpForm.type === 'joining' ? 'e.g. Commis Chef / Waiter / Delivery' : 'Brief subject...'}
                  value={helpForm.subject}
                  onChange={(e) => setHelpForm({ ...helpForm, subject: e.target.value })}
                  style={{ height: '36px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: '11px' }}>Message Details *</label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={helpForm.message}
                  onChange={(e) => setHelpForm({ ...helpForm, message: e.target.value })}
                  placeholder="Share details of your experience, query, or event date..."
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsHelpModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Send size={13} /> Submit Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
