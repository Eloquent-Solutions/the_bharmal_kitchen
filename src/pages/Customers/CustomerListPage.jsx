/**
 * Customer Directory, CRM & Prepaid NFC Smart Card Wallet
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full CRUD for Customer CRM:
 * - Link NFC Smart Card (Web NFC API `NDEFReader` + hardware UID extraction)
 * - Cashier Card Recharge Screen with automatic bonus percentage add-on
 * - Real-time cloud-managed wallet balance & ledger
 * - Synced with Firestore
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Calendar,
  DollarSign,
  Heart,
  CreditCard,
  Wifi,
  Zap,
  Edit2,
  Trash2,
  CheckCircle2,
  History,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import {
  getCustomers,
  saveCustomer,
  deleteCustomer,
  linkCustomerNfcCard,
  rechargeCustomerWallet,
  getRestaurantSettings,
} from '../../services/dataService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [settings, setSettings] = useState(getRestaurantSettings());

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Link NFC Modal
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [selectedForNfc, setSelectedForNfc] = useState(null);
  const [scannedUid, setScannedUid] = useState('');
  const [isScanningNfc, setIsScanningNfc] = useState(false);

  // Recharge Modal
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [selectedForRecharge, setSelectedForRecharge] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState(500);

  // History / Ledger Modal
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedForLedger, setSelectedForLedger] = useState(null);

  // Customer Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    tier: 'Silver',
    preferences: '',
    nfc_uid: '',
    wallet_balance: 0,
  });

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('tbk_customers_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('tbk_customers_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const refreshData = () => {
    setCustomers(getCustomers());
    setSettings(getRestaurantSettings());
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.nfc_uid || '').toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  // ── Customer CRUD ──
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      tier: 'Silver',
      preferences: '',
      nfc_uid: '',
      wallet_balance: 0,
    });
    setIsCustomerModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      tier: c.tier || 'Silver',
      preferences: c.preferences || '',
      nfc_uid: c.nfc_uid || '',
      wallet_balance: c.wallet_balance || 0,
    });
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }
    saveCustomer({
      ...(editingCustomer ? { id: editingCustomer.id } : {}),
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      tier: customerForm.tier,
      preferences: customerForm.preferences,
      nfc_uid: customerForm.nfc_uid.trim(),
      wallet_balance: parseFloat(customerForm.wallet_balance) || 0,
    });
    setCustomers(getCustomers());
    setIsCustomerModalOpen(false);
    toast.success(editingCustomer ? 'Customer updated!' : 'New customer registered!');
  };

  const handleDeleteCustomer = (id, name) => {
    if (window.confirm(`Delete customer "${name}"?`)) {
      deleteCustomer(id);
      setCustomers(getCustomers());
      toast.success('Customer removed');
    }
  };

  // ── NFC Link Workflow ──
  const handleOpenNfcLink = (cust) => {
    setSelectedForNfc(cust);
    setScannedUid(cust.nfc_uid || '');
    setIsScanningNfc(false);
    setIsNfcModalOpen(true);
  };

  const handleTriggerWebNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('Web NFC is not supported on this device/browser. Please enter the Card UID manually below.', {
        duration: 5000,
      });
      return;
    }

    try {
      setIsScanningNfc(true);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      toast.loading('📡 Hold NFC Smart Card near the back of your phone...', { id: 'nfc-scan' });

      ndef.addEventListener('reading', ({ serialNumber }) => {
        toast.dismiss('nfc-scan');
        setIsScanningNfc(false);
        const formattedUid = serialNumber || `NFC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        setScannedUid(formattedUid);
        toast.success(`NFC Card Detected! UID: ${formattedUid}`);
      });

      ndef.addEventListener('readingerror', () => {
        toast.dismiss('nfc-scan');
        setIsScanningNfc(false);
        toast.error('Failed to read NFC card. Please try tapping again.');
      });
    } catch (err) {
      setIsScanningNfc(false);
      toast.dismiss('nfc-scan');
      toast.error(`NFC Scan Error: ${err.message}`);
    }
  };

  const handleSaveNfcLink = (e) => {
    e.preventDefault();
    if (!scannedUid.trim()) {
      toast.error('Please scan or enter a valid Card UID');
      return;
    }
    try {
      linkCustomerNfcCard(selectedForNfc.id, scannedUid.trim());
      setCustomers(getCustomers());
      setIsNfcModalOpen(false);
      toast.success(`Smart Card linked to ${selectedForNfc.name}!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Card Recharge Workflow ──
  const handleOpenRecharge = (cust) => {
    setSelectedForRecharge(cust);
    setRechargeAmount(500);
    setIsRechargeModalOpen(true);
  };

  const bonusPercent = settings.enable_recharge_bonus !== false ? (parseFloat(settings.recharge_bonus_percentage) || 10.0) : 0;
  const calculatedBonus = parseFloat(((Number(rechargeAmount || 0) * bonusPercent) / 100).toFixed(2));
  const totalCredited = parseFloat((Number(rechargeAmount || 0) + calculatedBonus).toFixed(2));

  const handleExecuteRecharge = (e) => {
    e.preventDefault();
    if (!rechargeAmount || Number(rechargeAmount) <= 0) {
      toast.error('Please enter a valid recharge amount');
      return;
    }
    try {
      const res = rechargeCustomerWallet(selectedForRecharge.id, Number(rechargeAmount), 'Current Cashier');
      setCustomers(getCustomers());
      setIsRechargeModalOpen(false);
      toast.success(`₹${res.rechargeAmount} received! Added ₹${res.totalCredit} to wallet (${bonusPercent}% bonus). New Balance: ₹${res.newBalance}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Ledger / History ──
  const handleOpenLedger = (cust) => {
    setSelectedForLedger(cust);
    setIsLedgerModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Customer Directory & Prepaid NFC Wallet
            <span className="badge badge-primary" style={{ fontSize: '11px' }}>
              💳 Smart Card Enabled
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Manage VIP patrons, dining history, prepaid NFC smart cards, and wallet recharges with {bonusPercent}% bonus.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Register Customer
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Customers</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800' }}>{customers.length}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-primary)' }}>Active Smart Cards</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-primary)' }}>
            {customers.filter((c) => c.nfc_uid).length}
          </div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-success)' }}>Total Wallet Float in Cloud</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)' }}>
            {formatCurrency(customers.reduce((s, c) => s + (c.wallet_balance || 0), 0))}
          </div>
        </div>
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-warning)' }}>Recharge Bonus Rate</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)' }}>
            +{bonusPercent}%
          </div>
        </div>
      </div>

      {/* Search and Tier Filter */}
      <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, phone, email, NFC UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {['All', 'Platinum', 'Gold', 'Silver'].map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${tierFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTierFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Tier & Visits</th>
                <th>Smart Card (NFC)</th>
                <th>Wallet Balance</th>
                <th>Total Spent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{c.name}</div>
                      {c.preferences && (
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          ❤️ {c.preferences}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-sm)' }}>{c.phone}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.email || '—'}</div>
                    </td>
                    <td>
                      <span className={`badge ${c.tier === 'Platinum' ? 'badge-primary' : c.tier === 'Gold' ? 'badge-warning' : 'badge-neutral'}`}>
                        {c.tier}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {c.visits || 0} visits ({c.loyaltyPoints || 0} pts)
                      </div>
                    </td>
                    <td>
                      {c.nfc_uid ? (
                        <div>
                          <span className="badge badge-success" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            <Wifi size={11} style={{ marginRight: '4px' }} /> {c.nfc_uid}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                          onClick={() => handleOpenNfcLink(c)}
                        >
                          <Wifi size={12} /> Link Card
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '800', fontSize: 'var(--font-base)', color: (c.wallet_balance || 0) > 0 ? 'var(--color-success)' : 'var(--text-tertiary)' }}>
                        {formatCurrency(c.wallet_balance || 0)}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: '10px', padding: '1px 6px', height: '22px' }}
                          onClick={() => handleOpenRecharge(c)}
                        >
                          + Recharge
                        </button>
                        {(c.wallet_transactions?.length || 0) > 0 && (
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenLedger(c)}
                            title="Transaction Ledger"
                            style={{ width: '22px', height: '22px' }}
                          >
                            <History size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {formatCurrency(c.totalSpent || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenNfcLink(c)}
                          title="Card NFC Settings"
                        >
                          <CreditCard size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteCustomer(c.id, c.name)}
                          title="Delete Customer"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Link NFC Smart Card Modal ── */}
      {isNfcModalOpen && selectedForNfc && (
        <div className="modal-backdrop" onClick={() => setIsNfcModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={20} style={{ color: 'var(--color-primary)' }} /> Link Prepaid Smart Card
              </h3>
              <button className="btn-icon" onClick={() => setIsNfcModalOpen(false)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-glass)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>{selectedForNfc.name}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{selectedForNfc.phone}</div>
            </div>

            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <button
                type="button"
                className={`btn ${isScanningNfc ? 'btn-danger' : 'btn-primary'}`}
                style={{ width: '100%', padding: '12px', fontSize: 'var(--font-base)', fontWeight: '700', display: 'flex', justifyContent: 'center', gap: '8px' }}
                onClick={handleTriggerWebNfcScan}
              >
                <Wifi size={20} />
                {isScanningNfc ? 'Scanning... (Tap Card on Phone)' : 'Tap to Scan with Phone NFC'}
              </button>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Uses browser Web NFC API. Or enter the hardware card UID below.
              </div>
            </div>

            <form onSubmit={handleSaveNfcLink} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <div>
                <label className="label">Hardware Card UID (Unique Identifier)</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. 04:5A:8B:E2:19:64:80"
                  value={scannedUid}
                  onChange={(e) => setScannedUid(e.target.value)}
                  style={{ fontFamily: 'monospace', fontWeight: '700' }}
                />
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Security Guarantee:</strong> Financial balance is NEVER stored on the card chip. Card only holds the hardware UID. All money and transactions are stored safely on the cloud database.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNfcModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Link Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cashier Card Recharge Modal ── */}
      {isRechargeModalOpen && selectedForRecharge && (
        <div className="modal-backdrop" onClick={() => setIsRechargeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} style={{ color: 'var(--color-warning)' }} /> Recharge Prepaid Card
              </h3>
              <button className="btn-icon" onClick={() => setIsRechargeModalOpen(false)}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-glass)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700' }}>{selectedForRecharge.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                    Card UID: {selectedForRecharge.nfc_uid || 'Unlinked'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Current Balance</div>
                  <div style={{ fontWeight: '800', color: 'var(--color-success)' }}>
                    {formatCurrency(selectedForRecharge.wallet_balance || 0)}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleExecuteRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Cash Paid by Customer (₹)</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  className="input"
                  required
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  style={{ fontSize: 'var(--font-xl)', fontWeight: '800' }}
                />
              </div>

              {/* Quick Amount Pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[200, 400, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setRechargeAmount(amt)}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Bonus Breakdown Card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Cash Received:</span>
                  <span style={{ fontWeight: '700' }}>₹{Number(rechargeAmount || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                  <span>Bonus Add-on ({bonusPercent}%):</span>
                  <span style={{ fontWeight: '700' }}>+₹{calculatedBonus}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', fontSize: 'var(--font-base)', fontWeight: '900', color: 'var(--color-primary)' }}>
                  <span>Total Wallet Credit:</span>
                  <span>{formatCurrency(totalCredited)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRechargeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ fontWeight: '800' }}>
                  <CheckCircle2 size={16} /> Collect Cash & Credit Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Ledger Modal ── */}
      {isLedgerModalOpen && selectedForLedger && (
        <div className="modal-backdrop" onClick={() => setIsLedgerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                Wallet Ledger: {selectedForLedger.name}
              </h3>
              <button className="btn-icon" onClick={() => setIsLedgerModalOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Card UID:</span>
                <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{selectedForLedger.nfc_uid || 'None'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Current Balance:</span>
                <div style={{ fontWeight: '800', color: 'var(--color-success)', fontSize: 'var(--font-lg)' }}>
                  {formatCurrency(selectedForLedger.wallet_balance || 0)}
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(selectedForLedger.wallet_transactions || []).map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tx.type === 'recharge' ? (
                      <ArrowUpRight size={16} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <ArrowDownRight size={16} style={{ color: 'var(--color-danger)' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                        {tx.type === 'recharge' ? 'Recharge + Bonus' : `Debit (${tx.orderId || 'Order'})`}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {formatDate(tx.timestamp)} {tx.cashier ? `• ${tx.cashier}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: '800' }}>
                    <span style={{ color: tx.type === 'recharge' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {tx.type === 'recharge' ? `+${formatCurrency(tx.totalCredit || tx.amount)}` : `-${formatCurrency(tx.amount)}`}
                    </span>
                    {tx.bonus > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-warning)' }}>
                        (Bonus: ₹{tx.bonus})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Customer Modal ── */}
      {isCustomerModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingCustomer ? 'Edit Customer Profile' : 'Register New Customer'}
              </h3>
              <button className="btn-icon" onClick={() => setIsCustomerModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Customer Full Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Farhan Merchant"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    className="input"
                    required
                    placeholder="+91 98000 00000"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">VIP Tier</label>
                  <select
                    className="input"
                    value={customerForm.tier}
                    onChange={(e) => setCustomerForm({ ...customerForm, tier: e.target.value })}
                  >
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="customer@example.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Smart Card NFC UID (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 04:5A:8B:E2:19:64:80"
                  value={customerForm.nfc_uid}
                  onChange={(e) => setCustomerForm({ ...customerForm, nfc_uid: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Dining Preferences / Notes</label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="e.g. Bohra Halal, Corner booth, Less spicy"
                  value={customerForm.preferences}
                  onChange={(e) => setCustomerForm({ ...customerForm, preferences: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
