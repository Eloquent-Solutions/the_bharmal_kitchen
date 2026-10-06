/**
 * POS Page — Point of Sale Interface
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Includes:
 * - Direct Combos & Royal Thaals selection
 * - Food cards with image links & dynamic portion readiness
 * - Only dishes with assigned category appear (recipes without category are held back until categorized)
 * - Auto-deduction of raw materials on checkout
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  CheckCircle2,
  Layers,
  Sparkles,
  UserCheck,
  Bike,
  Package,
  CreditCard,
  Wifi,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Zap,
} from 'lucide-react';
import {
  getMenuItems,
  getCategories,
  getCombos,
  calculateDishPortionsAvailable,
  deductIngredientsForOrder,
  saveOrder,
  getTables,
  getChannelSettings,
  getRestaurantSettings,
  getCustomers,
  findCustomerByNfcUid,
  debitCustomerWallet,
} from '../../services/dataService';
import { useAuth } from '../../hooks/useAuth';
import { startOrderListener, stopOrderListener } from '../../services/realtimeOrderService';
import { formatCurrency } from '../../utils/formatters';
import { calculateOrderTotals } from '../../utils/calculations';
import toast from 'react-hot-toast';
import './POSPage.css';

export default function POSPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [tables, setTables] = useState([]);
  const [channelSettings, setChannelSettings] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine-in');
  const [selectedTable, setSelectedTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryPartner, setDeliveryPartner] = useState('Direct Delivery (Raju)');
  const [selectedCaptain, setSelectedCaptain] = useState('Captain Shabbir');

  useEffect(() => {
    refreshData();

    const handleSync = () => refreshData();
    window.addEventListener('tbk_tables_updated', handleSync);
    window.addEventListener('tbk_channel_settings_updated', handleSync);
    window.addEventListener('storage', handleSync);

    // Listen in real-time for chef status changes (e.g. order marked cooked)
    startOrderListener(
      () => {
        // Handled internally by service with audio tone + browser notification
      },
      { viewRole: 'pos', soundEnabled: true }
    );

    return () => {
      stopOrderListener();
      window.removeEventListener('tbk_tables_updated', handleSync);
      window.removeEventListener('tbk_channel_settings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const refreshData = () => {
    setCategories(getCategories());
    setItems(getMenuItems());
    setCombos(getCombos());
    const loadedTables = getTables();
    setTables(loadedTables);
    setSelectedTable((prev) => {
      if (loadedTables && loadedTables.length > 0) {
        return loadedTables.some((t) => t.name === prev) ? prev : loadedTables[0].name;
      }
      return prev || '';
    });
    setChannelSettings(getChannelSettings());
  };

  // Requirement: Dishes without an assigned category do NOT show in POS until categorized in Menu Items
  const filteredDishes = items.filter((item) => {
    if (!item.category || item.category.trim() === '' || item.category === 'Uncategorized') {
      return false; // Withhold until category is selected
    }
    const matchesCategory =
      activeCategory === 'All' ||
      item.category === activeCategory ||
      item.categoryId === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredCombos = combos.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getItemCartQty = (itemId) => {
    const cartItem = cart.find((c) => c.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const addToCart = (item, isCombo = false) => {
    if (isCombo) {
      setCart((prev) => {
        const existing = prev.find((c) => c.id === item.id);
        if (existing) {
          return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        }
        return [...prev, { ...item, quantity: 1, isCombo: true }];
      });
      toast.success(`Added Combo "${item.name}" to cart`);
      return;
    }

    const portionInfo = calculateDishPortionsAvailable(item.id, item.name);
    const inCartQty = getItemCartQty(item.id);

    if (item.isAvailable === false || portionInfo.portionsAvailable === 0) {
      toast.error(`"${item.name}" is currently 86 (Sold Out - Raw Materials Depleted)!`);
      return;
    }

    if (portionInfo.recipeFound && inCartQty >= portionInfo.portionsAvailable) {
      toast.error(`Cannot add more! Only ${portionInfo.portionsAvailable} portions can be made from current stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name} to cart`);
  };

  const updateQuantity = (itemId, delta) => {
    const targetItem = items.find((i) => i.id === itemId);
    const inCartQty = getItemCartQty(itemId);

    if (delta > 0 && targetItem) {
      const portionInfo = calculateDishPortionsAvailable(targetItem.id, targetItem.name);
      if (portionInfo.recipeFound && inCartQty >= portionInfo.portionsAvailable) {
        toast.error(`Cannot exceed ${portionInfo.portionsAvailable} portions ready in stock!`);
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((c) => {
          if (c.id === itemId) {
            const next = c.quantity + delta;
            return next > 0 ? { ...c, quantity: next } : null;
          }
          return c;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  const restaurantSettings = getRestaurantSettings();
  const totals = calculateOrderTotals(cart, {
    cgstRate: Number(restaurantSettings.cgstRate ?? 0),
    sgstRate: Number(restaurantSettings.sgstRate ?? 0),
    serviceChargeRate: Number(restaurantSettings.serviceCharge ?? 0),
    roundOff: restaurantSettings.roundOff !== false,
  });

  // ── Smart Card NFC Payment Modal State ──
  const [isSmartCardModalOpen, setIsSmartCardModalOpen] = useState(false);
  const [cardNfcUid, setCardNfcUid] = useState('');
  const [isScanningNfc, setIsScanningNfc] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const handleOpenSmartCardCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please select menu items or combos.');
      return;
    }
    setPaymentSuccessData(null);
    setPaymentError(null);
    setCardNfcUid('');
    setIsScanningNfc(false);
    const customers = getCustomers();
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
    setIsSmartCardModalOpen(true);
  };

  const handleScanCardNfc = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('Web NFC is not supported on this browser/device. Please select customer or enter UID manually.', { duration: 5000 });
      return;
    }
    try {
      setIsScanningNfc(true);
      setPaymentError(null);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      toast.loading('📡 Tap Customer Smart Card on back of phone...', { id: 'nfc-pay-scan' });

      ndef.addEventListener('reading', ({ serialNumber }) => {
        toast.dismiss('nfc-pay-scan');
        setIsScanningNfc(false);
        const uid = serialNumber || '';
        setCardNfcUid(uid);
        processSmartCardPayment(uid);
      });

      ndef.addEventListener('readingerror', () => {
        toast.dismiss('nfc-pay-scan');
        setIsScanningNfc(false);
        setPaymentError({ message: 'NFC Read error. Please tap card again.' });
      });
    } catch (err) {
      setIsScanningNfc(false);
      toast.dismiss('nfc-pay-scan');
      setPaymentError({ message: `NFC Error: ${err.message}` });
    }
  };

  const processSmartCardPayment = (targetUidOrCustomerId) => {
    try {
      const orderId = `TBK-${Date.now().toString().slice(-4)}`;
      const result = debitCustomerWallet(targetUidOrCustomerId, totals.grandTotal, orderId);

      // Auto-deduct raw materials
      const standardDishes = cart.filter((c) => !c.isCombo);
      deductIngredientsForOrder(standardDishes, orderId);

      // Save order marked as PAID with smart_card
      saveOrder({
        id: orderId,
        orderNumber: Number(orderId.replace('TBK-', '')),
        orderType: orderType.toLowerCase().replace('-', '_'),
        table: orderType === 'Dine-in' ? selectedTable : null,
        customer: result.customer.name || customerName.trim() || 'Smart Card Patron',
        phone: result.customer.phone || customerPhone.trim() || null,
        captain: orderType === 'Dine-in' ? selectedCaptain : null,
        deliveryPartner: orderType === 'Delivery' ? deliveryPartner : null,
        items: cart.map((c) => ({
          id: c.id,
          name: c.name,
          qty: c.quantity,
          price: c.price,
          isCombo: !!c.isCombo,
        })),
        total: totals.grandTotal,
        status: 'received',
        paymentStatus: 'paid',
        paymentMethod: 'smart_card',
        cardUid: result.customer.nfc_uid,
        createdBy: user?.displayName || user?.email || 'POS Staff',
        createdAt: new Date().toISOString(),
      });

      setPaymentSuccessData({
        orderId,
        customer: result.customer,
        debitedAmount: result.debitedAmount,
        remainingBalance: result.remainingBalance,
      });
      setPaymentError(null);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      refreshData();
      toast.success(`💳 Smart Card Payment Verified! ₹${result.debitedAmount} deducted. Order #${orderId} sent to Kitchen!`);
    } catch (err) {
      setPaymentError({
        message: err.message,
        currentBalance: err.currentBalance,
        deficit: err.deficit,
      });
    }
  };

  const handleManualCustomerCardSubmit = (e) => {
    e.preventDefault();
    if (cardNfcUid.trim()) {
      processSmartCardPayment(cardNfcUid.trim());
    } else if (selectedCustomerId) {
      processSmartCardPayment(selectedCustomerId);
    } else {
      toast.error('Please tap card or select a customer profile');
    }
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please select menu items or combos.');
      return;
    }

    const orderId = `TBK-${Date.now().toString().slice(-4)}`;

    // Auto-deduct raw materials for standard dishes
    const standardDishes = cart.filter((c) => !c.isCombo);
    const deductions = deductIngredientsForOrder(standardDishes, orderId);

    // Save order
    saveOrder({
      id: orderId,
      orderNumber: Number(orderId.replace('TBK-', '')),
      orderType: orderType.toLowerCase().replace('-', '_'),
      table: orderType === 'Dine-in' ? selectedTable : null,
      customer: customerName.trim() || 'Walk-in Guest',
      phone: customerPhone.trim() || null,
      captain: orderType === 'Dine-in' ? selectedCaptain : null,
      deliveryPartner: orderType === 'Delivery' ? deliveryPartner : null,
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        qty: c.quantity,
        price: c.price,
        isCombo: !!c.isCombo,
      })),
      total: totals.grandTotal,
      status: 'received',
      paymentStatus: orderType === 'Takeaway' ? 'paid' : 'pending',
      createdBy: user?.displayName || user?.email || 'POS Staff',
      createdById: user?.uid || null,
      createdAt: new Date().toISOString(),
    });

    refreshData();

    if (deductions.length > 0) {
      toast.success(
        `Order #${orderId} Placed!\nAuto-deducted ${deductions.length} raw materials from inventory.`,
        { duration: 4000 }
      );
    } else {
      toast.success(`Order #${orderId} placed & dispatched to kitchen!`);
    }

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="pos-layout">
      {/* ── Left: Menu Area ── */}
      <div className="pos-main">
        {/* Top Control Bar */}
        <div className="pos-top-controls">
          <div className="pos-search-wrapper">
            <Search size={18} className="pos-search-icon" />
            <input
              type="text"
              className="pos-search-input"
              placeholder="Search dishes or combos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pos-channel-tabs">
            {['Dine-in', 'Takeaway', 'Delivery'].map((type) => {
              const isAllowed =
                !channelSettings ||
                (type === 'Dine-in' && channelSettings.allowDineIn !== false) ||
                (type === 'Takeaway' && channelSettings.allowTakeaway !== false) ||
                (type === 'Delivery' && channelSettings.allowDelivery !== false);
              return (
                <button
                  key={type}
                  className={`pos-channel-btn ${orderType === type ? 'active' : ''}`}
                  onClick={() => setOrderType(type)}
                  style={{ opacity: isAllowed ? 1 : 0.65 }}
                  title={!isAllowed ? `${type} is turned OFF in Restaurant Settings` : ''}
                >
                  {type}
                  {!isAllowed && (
                    <span style={{ fontSize: '9px', marginLeft: '4px', color: 'var(--color-warning)' }}>
                      (Off)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {orderType === 'Dine-in' && (
            tables.length > 0 ? (
              <select
                className="input"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{ width: '120px', height: '38px', fontSize: '13px', fontWeight: '700' }}
              >
                {tables.map((t) => (
                  <option key={t.id || t.name} value={t.name}>
                    {t.name} ({t.capacity || t.seats || 4}p)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="input"
                placeholder="Table # (e.g. T-1)"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{ width: '120px', height: '38px', fontSize: '13px', fontWeight: '600' }}
              />
            )
          )}
        </div>

        {/* Category Thumbnail Bar + Combos Tab */}
        <div className="pos-category-scroller">
          <div
            className={`pos-category-card ${activeCategory === 'All' ? 'active' : ''}`}
            onClick={() => setActiveCategory('All')}
          >
            <span style={{ fontSize: '18px' }}>🍽️</span>
            <span className="pos-category-name">All Menu</span>
            <span className="pos-category-count">{filteredDishes.length}</span>
          </div>

          {/* Combos Tab */}
          <div
            className={`pos-category-card ${activeCategory === 'Combos' ? 'active' : ''}`}
            onClick={() => setActiveCategory('Combos')}
            style={{ borderColor: activeCategory === 'Combos' ? 'var(--color-primary)' : 'rgba(200, 169, 126, 0.4)' }}
          >
            <span style={{ fontSize: '18px' }}>✨</span>
            <span className="pos-category-name">Bohra Thaals & Combos</span>
            <span className="pos-category-count">{combos.length}</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`pos-category-card ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.name)}
            >
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="pos-category-thumb" />
              ) : (
                <span style={{ fontSize: '16px' }}>🍛</span>
              )}
              <span className="pos-category-name">{cat.name}</span>
            </div>
          ))}
        </div>

        {/* Content Area: Combos OR Dishes */}
        <div className="pos-items-grid">
          {/* Show Combos when selected or in All if searching */}
          {(activeCategory === 'Combos' || (activeCategory === 'All' && filteredCombos.length > 0 && searchQuery)) && (
            filteredCombos.map((combo) => {
              const inCart = getItemCartQty(combo.id);
              return (
                <div
                  key={combo.id}
                  className="pos-dish-card"
                  style={{ border: '2px solid rgba(200, 169, 126, 0.4)' }}
                  onClick={() => addToCart(combo, true)}
                >
                  <div className="pos-dish-image-wrapper">
                    <img
                      src={combo.image || 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80'}
                      alt={combo.name}
                      className="pos-dish-image"
                      loading="lazy"
                    />
                    <div className="pos-dish-image-overlay" />
                    <span className="pos-station-tag" style={{ background: 'var(--color-primary)', color: '#000', fontWeight: '800' }}>
                      Royal Thaal Package
                    </span>
                  </div>

                  <div className="pos-dish-body">
                    <div>
                      <div className="pos-dish-title" style={{ color: 'var(--color-primary)' }}>{combo.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Serves: <strong>{combo.serves}</strong>
                      </div>
                      <div className="pos-dish-desc">{combo.description}</div>
                    </div>

                    <div className="pos-dish-footer" onClick={(e) => e.stopPropagation()}>
                      <span className="pos-dish-price">{formatCurrency(combo.price)}</span>
                      {inCart > 0 ? (
                        <div className="pos-qty-stepper">
                          <button className="pos-step-btn" onClick={() => updateQuantity(combo.id, -1)}>-</button>
                          <span className="pos-step-qty">{inCart}</span>
                          <button className="pos-step-btn" onClick={() => updateQuantity(combo.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className="pos-add-btn" onClick={() => addToCart(combo, true)}>
                          <Plus size={14} /> Add Thaal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Regular Menu Dishes (Only with Category) */}
          {activeCategory !== 'Combos' &&
            filteredDishes.map((item) => {
              const inCart = getItemCartQty(item.id);
              const portionInfo = calculateDishPortionsAvailable(item.id, item.name);
              const isSoldOut = item.isAvailable === false || portionInfo.portionsAvailable === 0;

              return (
                <div
                  key={item.id}
                  className={`pos-dish-card ${isSoldOut ? 'unavailable' : ''}`}
                  onClick={() => !isSoldOut && addToCart(item)}
                >
                  <div className="pos-dish-image-wrapper">
                    <img
                      src={
                        item.image ||
                        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={item.name}
                      className="pos-dish-image"
                      loading="lazy"
                    />
                    <div className="pos-dish-image-overlay" />
                    <div className="pos-badge-veg-type">
                      <span className={`pos-type-dot ${item.type === 'veg' ? 'veg' : 'non-veg'}`} />
                    </div>
                    <span className="pos-station-tag">{item.station}</span>
                  </div>

                  <div className="pos-dish-body">
                    <div>
                      <div className="pos-dish-title">{item.name}</div>
                      <div className="pos-dish-desc">{item.description}</div>

                      {portionInfo.recipeFound ? (
                        portionInfo.portionsAvailable > 10 ? (
                          <span className="pos-portion-tag good">● {portionInfo.portionsAvailable} Ready</span>
                        ) : portionInfo.portionsAvailable > 0 ? (
                          <span className="pos-portion-tag low">⚠️ Only {portionInfo.portionsAvailable} Left</span>
                        ) : (
                          <span className="pos-portion-tag soldout">✕ Sold Out (Raw Stock)</span>
                        )
                      ) : (
                        <span className="pos-portion-tag good">● In Stock</span>
                      )}
                    </div>

                    <div className="pos-dish-footer" onClick={(e) => e.stopPropagation()}>
                      <span className="pos-dish-price">{formatCurrency(item.price)}</span>

                      {isSoldOut ? (
                        <span className="badge badge-danger" style={{ fontSize: '10px' }}>
                          86 Sold Out
                        </span>
                      ) : inCart > 0 ? (
                        <div className="pos-qty-stepper">
                          <button className="pos-step-btn" onClick={() => updateQuantity(item.id, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="pos-step-qty">{inCart}</span>
                          <button className="pos-step-btn" onClick={() => updateQuantity(item.id, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button className="pos-add-btn" onClick={() => addToCart(item)}>
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Right: Cart Sidebar ── */}
      <div className="pos-sidebar">
        <div className="pos-cart-header">
          <div className="pos-cart-title">
            <ShoppingCart size={18} style={{ color: 'var(--color-primary)' }} />
            <span>
              {orderType} {orderType === 'Dine-in' ? `(${selectedTable})` : ''}
            </span>
          </div>
          {cart.length > 0 && (
            <button className="btn-icon" onClick={clearCart} title="Clear Cart">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Customer & Staff Assignment */}
        <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input
              type="text"
              className="input"
              placeholder="Guest Name..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ fontSize: '12px', height: '34px' }}
            />
            <input
              type="tel"
              className="input"
              placeholder="Guest Phone..."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{ fontSize: '12px', height: '34px' }}
            />
          </div>

          {orderType === 'Dine-in' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Captain:</span>
              <select
                className="input"
                value={selectedCaptain}
                onChange={(e) => setSelectedCaptain(e.target.value)}
                style={{ fontSize: '12px', height: '32px', flex: 1 }}
              >
                <option value="Captain Shabbir">Captain Shabbir</option>
                <option value="Captain Taher">Captain Taher</option>
                <option value="Captain Mufaddal">Captain Mufaddal</option>
                <option value="Waiter Ali">Waiter Ali</option>
              </select>
            </div>
          )}

          {orderType === 'Delivery' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Delivery:</span>
              <select
                className="input"
                value={deliveryPartner}
                onChange={(e) => setDeliveryPartner(e.target.value)}
                style={{ fontSize: '12px', height: '32px', flex: 1 }}
              >
                <option value="Direct Delivery (Raju)">Direct Delivery Rider (Raju)</option>
                <option value="Swiggy Fleet">Swiggy Fleet</option>
                <option value="Zomato Fleet">Zomato Fleet</option>
                <option value="Dunzo Partner">Dunzo Partner</option>
              </select>
            </div>
          )}
        </div>

        {/* Cart Item Rows */}
        <div className="pos-cart-items-scroll">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--text-tertiary)' }}>
              <UtensilsCrossed size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p style={{ fontSize: 'var(--font-sm)', fontWeight: '600' }}>Cart is Empty</p>
              <p style={{ fontSize: '11px' }}>Click any dish card or combo to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="pos-cart-row">
                <div>
                  <div className="pos-cart-item-name" style={{ color: item.isCombo ? 'var(--color-primary)' : 'inherit' }}>
                    {item.isCombo ? '✨ ' : ''}{item.name}
                  </div>
                  <div className="pos-cart-item-sub">
                    {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>

                <div className="pos-qty-stepper">
                  <button className="pos-step-btn" onClick={() => updateQuantity(item.id, -1)}>-</button>
                  <span className="pos-step-qty">{item.quantity}</span>
                  <button className="pos-step-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary & Order Dispatch */}
        <div className="pos-cart-summary">
          <div className="pos-summary-line">
            <span>Subtotal</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="pos-summary-line">
            <span>CGST (2.5%) + SGST (2.5%)</span>
            <span>{formatCurrency(totals.taxAmount)}</span>
          </div>
          <div className="pos-summary-total">
            <span>Total Payable</span>
            <span>{formatCurrency(totals.grandTotal)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="pos-checkout-btn"
              onClick={handleOpenSmartCardCheckout}
              style={{ background: 'linear-gradient(135deg, #c8a97e 0%, #b38d58 100%)', color: '#1a1815', fontWeight: '800' }}
            >
              <CreditCard size={18} /> Pay via Smart Card (NFC)
            </button>

            <button className="pos-checkout-btn" onClick={handlePlaceOrder} style={{ opacity: 0.9 }}>
              <CheckCircle2 size={18} /> Place Order (Cash / UPI)
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile-Friendly Smart Card NFC Payment Terminal Modal ── */}
      {isSmartCardModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSmartCardModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={22} style={{ color: 'var(--color-primary)' }} /> Smart Card Terminal
              </h3>
              <button className="btn-icon" onClick={() => setIsSmartCardModalOpen(false)}>✕</button>
            </div>

            {/* Bill Summary Preview */}
            <div style={{ background: 'var(--bg-glass)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Total Bill Due</span>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '900', color: 'var(--color-primary)' }}>
                  {formatCurrency(totals.grandTotal)}
                </div>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                {cart.length} Item(s)
              </span>
            </div>

            {/* ── Success Screen ── */}
            {paymentSuccessData ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '800', color: 'var(--color-success)' }}>
                    Payment Successful!
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
                    Order #{paymentSuccessData.orderId} Paid & Sent to Kitchen
                  </p>
                </div>

                <div style={{ width: '100%', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Card Holder:</span>
                    <span style={{ fontWeight: '700' }}>{paymentSuccessData.customer.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Amount Deducted:</span>
                    <span style={{ fontWeight: '800', color: 'var(--color-danger)' }}>
                      -{formatCurrency(paymentSuccessData.debitedAmount)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Remaining Wallet Balance:</span>
                    <span style={{ fontWeight: '800', color: 'var(--color-success)' }}>
                      {formatCurrency(paymentSuccessData.remainingBalance)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                  onClick={() => setIsSmartCardModalOpen(false)}
                >
                  Done & Return to POS
                </button>
              </div>
            ) : (
              /* ── Payment Scanner Screen ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {paymentError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-danger)' }}>Payment Failed</div>
                      <div>{paymentError.message}</div>
                      {paymentError.deficit !== undefined && (
                        <div style={{ marginTop: '4px', fontWeight: '700' }}>
                          Current Balance: ₹{paymentError.currentBalance} | Shortage: ₹{paymentError.deficit}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className={`btn ${isScanningNfc ? 'btn-danger' : 'btn-primary'}`}
                  style={{ width: '100%', padding: '14px', fontSize: 'var(--font-base)', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  onClick={handleScanCardNfc}
                >
                  <Wifi size={22} />
                  {isScanningNfc ? 'Scanning... Tap Smart Card on Phone' : 'Tap Card with Phone NFC Reader'}
                </button>

                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  — OR SELECT REGISTERED CARD PATRON —
                </div>

                <form onSubmit={handleManualCustomerCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="label">Registered Customer Smart Card</label>
                    <select
                      className="input"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setCardNfcUid('');
                      }}
                    >
                      {getCustomers().map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — Balance: {formatCurrency(c.wallet_balance || 0)} {c.nfc_uid ? `(${c.nfc_uid})` : '(No Card)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Or Enter Hardware UID Manually</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 04:5A:8B:E2:19:64:80"
                      value={cardNfcUid}
                      onChange={(e) => setCardNfcUid(e.target.value)}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsSmartCardModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success" style={{ fontWeight: '800' }}>
                      Verify & Deduct {formatCurrency(totals.grandTotal)}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
