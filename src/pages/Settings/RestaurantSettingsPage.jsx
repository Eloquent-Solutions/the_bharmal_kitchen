/**
 * Restaurant Profile, UPI Payment & Terms Settings
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Fully editable:
 *  - Business details & GST
 *  - UPI Merchant ID & Online Payment Settings
 *  - Customer Terms of Service & Ordering Policy
 */

import { useState, useEffect } from 'react';
import {
  Building,
  Save,
  Percent,
  QrCode,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Bike,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  Key,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import {
  getTermsAndConditions,
  saveTermsAndConditions,
  getUpiSettings,
  saveUpiSettings,
  getChannelSettings,
  saveChannelSettings,
  getPaymentGatewayConfig,
  savePaymentGatewayConfig,
  getRestaurantSettings,
  saveRestaurantSettings,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function RestaurantSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const [settings, setSettings] = useState(getRestaurantSettings());
  const [upi, setUpi] = useState(getUpiSettings());
  const [terms, setTerms] = useState(getTermsAndConditions());
  const [channels, setChannels] = useState(getChannelSettings());
  const [gateway, setGateway] = useState(getPaymentGatewayConfig());

  useEffect(() => {
    setSettings(getRestaurantSettings());
    setUpi(getUpiSettings());
    setTerms(getTermsAndConditions());
    setChannels(getChannelSettings());
    setGateway(getPaymentGatewayConfig());
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    saveRestaurantSettings(settings);
    toast.success('Restaurant profile, tax & prepaid card settings saved and synced with Firebase!');
  };

  const handleSaveChannels = (e) => {
    e.preventDefault();
    saveChannelSettings(channels);
    toast.success('Ordering channel availability & payment rules saved!');
  };

  const handleTogglePaymentMethod = (channel, method) => {
    setChannels((prev) => {
      const current = prev.paymentMethods?.[channel] || [];
      const updated = current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method];
      return {
        ...prev,
        paymentMethods: {
          ...prev.paymentMethods,
          [channel]: updated,
        },
      };
    });
  };

  const handleSaveGateway = (e) => {
    e.preventDefault();
    savePaymentGatewayConfig(gateway);
    toast.success('Payment gateway configuration saved!');
  };

  const handleSaveUpi = (e) => {
    e.preventDefault();
    saveUpiSettings(upi);
    toast.success('UPI & Online Payment configurations saved successfully!');
  };

  const handleSaveTerms = (e) => {
    e.preventDefault();
    saveTermsAndConditions(terms);
    toast.success('Terms & Conditions updated! Customers will now see these terms.');
  };

  const handleAddTermSection = () => {
    setTerms({
      ...terms,
      sections: [
        ...(terms.sections || []),
        { heading: `${(terms.sections?.length || 0) + 1}. New Policy Clause`, content: 'Enter policy guidelines here...' },
      ],
    });
  };

  const handleRemoveTermSection = (idx) => {
    setTerms({
      ...terms,
      sections: terms.sections.filter((_, i) => i !== idx),
    });
  };

  const handleTermSectionChange = (idx, field, val) => {
    const updated = [...(terms.sections || [])];
    updated[idx] = { ...updated[idx], [field]: val };
    setTerms({ ...terms, sections: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Restaurant & Ordering Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Configure business identifiers, UPI payment QR code, taxes, and customer terms & conditions.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'profile', label: '🏢 Business & Taxes' },
          { id: 'channels', label: '🚚 Channels & Payment Rules' },
          { id: 'gateway', label: '💳 Payment Gateway Guide' },
          { id: 'upi', label: '📱 UPI Direct QR Settings' },
          { id: 'terms', label: '📜 Terms & Conditions' },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ fontSize: '12px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Profile & Taxes ── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Building size={16} style={{ color: 'var(--color-primary)' }} /> Business Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Restaurant Brand Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Tagline / Subtitle</label>
                <input
                  type="text"
                  className="input"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
              </div>

              <div>
                <label className="label">FSSAI License Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.fssai}
                  onChange={(e) => setSettings({ ...settings, fssai: e.target.value })}
                />
              </div>

              <div>
                <label className="label">GSTIN (Tax Registration)</label>
                <input
                  type="text"
                  className="input"
                  value={settings.gstin}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="text"
                  className="input"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Official Email</label>
                <input
                  type="email"
                  className="input"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-3)' }}>
              <label className="label">Registered Physical Address (Printed on Receipts)</label>
              <textarea
                className="input"
                rows="2"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Percent size={16} style={{ color: 'var(--color-warning)' }} /> Taxes & Billing Engine
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">CGST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={settings.cgstRate}
                  onChange={(e) => setSettings({ ...settings, cgstRate: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="label">SGST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={settings.sgstRate}
                  onChange={(e) => setSettings({ ...settings, sgstRate: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="label">Auto Round-off Grand Total</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="roundOff"
                    checked={settings.roundOff}
                    onChange={(e) => setSettings({ ...settings, roundOff: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                  />
                  <label htmlFor="roundOff" style={{ fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                    Round to nearest ₹1
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── Prepaid Card Wallet Settings ── */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <CreditCard size={16} style={{ color: 'var(--color-primary)' }} /> Prepaid Card Wallet Settings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Configure customer NFC prepaid smart cards, wallet bonus top-ups, and cloud balance rules. All financial balances are stored safely on the cloud server database and linked via hardware UID.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              <div style={{ background: 'var(--bg-glass-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label htmlFor="enable_bonus" style={{ fontWeight: '700', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
                      Enable Recharge Bonus Add-on
                    </label>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Automatically credit bonus money on top of cash received
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="enable_bonus"
                    checked={settings.enable_recharge_bonus !== false}
                    onChange={(e) => setSettings({ ...settings, enable_recharge_bonus: e.target.checked })}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Bonus Percentage Add-on (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  className="input"
                  disabled={settings.enable_recharge_bonus === false}
                  value={settings.recharge_bonus_percentage !== undefined ? settings.recharge_bonus_percentage : 10.0}
                  onChange={(e) => setSettings({ ...settings, recharge_bonus_percentage: Number(e.target.value) })}
                  placeholder="10"
                />
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  e.g., Setting 10% means a customer paying ₹400 cash receives ₹440 credited into their card wallet balance.
                </div>
              </div>
            </div>

            {/* Dynamic Interactive Example Preview */}
            <div style={{ marginTop: 'var(--space-3)', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                ⚡ <strong>Live Recharge Formula:</strong> Customer pays ₹400 cash → Bonus (+{settings.enable_recharge_bonus !== false ? (settings.recharge_bonus_percentage || 10) : 0}%): ₹{((400 * (settings.enable_recharge_bonus !== false ? (settings.recharge_bonus_percentage || 10) : 0)) / 100).toFixed(0)} →
              </span>
              <span className="badge badge-success" style={{ fontSize: '12px', fontWeight: '800' }}>
                Wallet Balance Credited: ₹{400 + ((400 * (settings.enable_recharge_bonus !== false ? (settings.recharge_bonus_percentage || 10) : 0)) / 100)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save Business Profile & Wallet Settings
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 2: UPI & Online Payment Settings ── */}
      {activeTab === 'upi' && (
        <form onSubmit={handleSaveUpi} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <QrCode size={16} style={{ color: '#22c55e' }} /> UPI Gateway Configuration
            </h3>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Configure your restaurant's official UPI ID. When customers place online orders or pay via POS, dynamic QR codes and intent links (GPay, PhonePe, Paytm, BHIM) will automatically route funds to this account.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Restaurant UPI VPA ID *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={upi.upiId}
                  onChange={(e) => setUpi({ ...upi, upiId: e.target.value })}
                  placeholder="e.g. thebharmalskitchen@okhdfcbank"
                />
              </div>

              <div>
                <label className="label">Merchant Payee Name *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={upi.merchantName}
                  onChange={(e) => setUpi({ ...upi, merchantName: e.target.value })}
                  placeholder="The Bharmals Kitchen"
                />
              </div>

              <div>
                <label className="label">Business Type</label>
                <input
                  type="text"
                  className="input"
                  value={upi.businessType}
                  onChange={(e) => setUpi({ ...upi, businessType: e.target.value })}
                />
              </div>
            </div>

            {/* QR Code Live Preview */}
            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-glass-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=${upi.upiId}&pn=${encodeURIComponent(upi.merchantName)}&cu=INR`)}`}
                  alt="UPI QR Code Preview"
                  style={{ width: '130px', height: '130px', display: 'block' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)' }}>Live UPI QR Preview</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Payee: <strong>{upi.merchantName}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  VPA: <strong>{upi.upiId}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '6px' }}>
                  ✓ Compatible with GPay, PhonePe, Paytm, BHIM, Cred & Banking UPI apps
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save UPI Settings
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 3: Terms & Conditions (Customer Policy) ── */}
      {activeTab === 'terms' && (
        <form onSubmit={handleSaveTerms} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FileText size={16} style={{ color: 'var(--color-primary)' }} /> Customer Terms of Service & Ordering Policy
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  These terms are presented to customers on the website before they place orders. You can edit clauses, add refund/cancellation policies, or modify halal guarantees.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTermSection}
              >
                <Plus size={14} /> Add Clause
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">Policy Document Title</label>
              <input
                type="text"
                className="input"
                value={terms.title || ''}
                onChange={(e) => setTerms({ ...terms, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {terms.sections?.map((sec, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-glass-subtle)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      value={sec.heading}
                      onChange={(e) => handleTermSectionChange(idx, 'heading', e.target.value)}
                      style={{ fontWeight: '700', fontSize: '13px', width: '80%' }}
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleRemoveTermSection(idx)}
                      style={{ color: 'var(--color-danger)' }}
                      title="Remove Clause"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    className="input"
                    value={sec.content}
                    onChange={(e) => handleTermSectionChange(idx, 'content', e.target.value)}
                    style={{ fontSize: '12px', lineHeight: 1.4 }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save & Publish Terms
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 4: Channel Availability & Payment Rules ── */}
      {activeTab === 'channels' && (
        <form onSubmit={handleSaveChannels} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Dine-In Channel */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <UtensilsCrossed size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Dine-In Orders Channel</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="checkbox"
                  checked={channels.allowDineIn !== false}
                  onChange={(e) => setChannels({ ...channels, allowDineIn: e.target.checked })}
                />
                {channels.allowDineIn !== false ? (
                  <span className="badge badge-success">Channel Active</span>
                ) : (
                  <span className="badge badge-neutral">Channel Disabled</span>
                )}
              </label>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Allow customers and staff to place Dine-In table orders.
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <label className="label" style={{ marginBottom: '8px' }}>Allowed Payment Methods for Dine-In</label>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                {[
                  { id: 'upi', label: '📱 UPI / QR Code' },
                  { id: 'cash', label: '💵 Cash' },
                  { id: 'card', label: '💳 Credit / Debit Card' },
                ].map((m) => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channels.paymentMethods?.dine_in?.includes(m.id)}
                      onChange={() => handleTogglePaymentMethod('dine_in', m.id)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Takeaway & Pickup Channel */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Takeaway & Self-Pickup Channel</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="checkbox"
                  checked={channels.allowTakeaway !== false}
                  onChange={(e) => setChannels({ ...channels, allowTakeaway: e.target.checked })}
                />
                {channels.allowTakeaway !== false ? (
                  <span className="badge badge-success">Channel Active</span>
                ) : (
                  <span className="badge badge-neutral">Channel Disabled</span>
                )}
              </label>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              Allow customers to order for parcel takeaway and self-pickup from the restaurant counter.
            </p>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <label className="label" style={{ marginBottom: '8px' }}>Allowed Payment Methods for Takeaway / Pickup</label>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                {[
                  { id: 'upi', label: '📱 UPI / QR Code' },
                  { id: 'cash', label: '💵 Cash at Counter' },
                  { id: 'card', label: '💳 Card at Counter' },
                ].map((m) => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={channels.paymentMethods?.takeaway?.includes(m.id)}
                      onChange={() => handleTogglePaymentMethod('takeaway', m.id)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Home Delivery Channel */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Bike size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Home Delivery Channel</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="checkbox"
                  checked={channels.allowDelivery !== false}
                  onChange={(e) => setChannels({ ...channels, allowDelivery: e.target.checked })}
                />
                {channels.allowDelivery !== false ? (
                  <span className="badge badge-success">Delivery Open</span>
                ) : (
                  <span className="badge badge-warning">Delivery Paused</span>
                )}
              </label>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              When turned off, customers will see your custom notice banner and will be directed to Takeaway or Dine-in.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Delivery Unavailable Notice Message (Shown to Customers)</label>
                <input
                  type="text"
                  className="input"
                  value={channels.deliveryUnavailableReason || ''}
                  onChange={(e) => setChannels({ ...channels, deliveryUnavailableReason: e.target.value })}
                  placeholder="e.g. Delivery is temporarily paused due to heavy rain. Please order for Takeaway or Dine-in!"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Standard Delivery Fee (₹)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={channels.deliveryFee ?? 40}
                    onChange={(e) => setChannels({ ...channels, deliveryFee: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label">Minimum Order for Delivery (₹)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={channels.minDeliveryOrder ?? 200}
                    onChange={(e) => setChannels({ ...channels, minDeliveryOrder: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <label className="label" style={{ marginBottom: '8px' }}>Allowed Payment Methods for Home Delivery</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {[
                    { id: 'upi', label: '📱 Online UPI (Prepaid)' },
                    { id: 'cash', label: '💵 Cash on Delivery (COD)' },
                    { id: 'card', label: '💳 Card on Delivery' },
                  ].map((m) => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={channels.paymentMethods?.delivery?.includes(m.id)}
                        onChange={() => handleTogglePaymentMethod('delivery', m.id)}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Tip: Most restaurants enforce Online UPI Only for home delivery to prevent rider fraud and unpaid cancellations.
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save Channel Rules
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 5: Payment Gateway Setup Guide ── */}
      {activeTab === 'gateway' && (
        <form onSubmit={handleSaveGateway} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Active Gateway Selection */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <CreditCard size={18} style={{ color: 'var(--color-primary)' }} /> Select Online Payment Gateway
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {[
                { id: 'upi_direct', title: '⚡ Direct UPI (Recommended)', desc: 'Zero transaction fees (0% MDR). Direct ICICI/HDFC bank deposit via dynamic QR.' },
                { id: 'razorpay', title: '💳 Razorpay', desc: 'Accepts Credit/Debit Cards, NetBanking, Wallets, and UPI with webhook verification (~2% fee).' },
                { id: 'cashfree', title: '🪙 Cashfree Payments', desc: 'Fast merchant onboarding, low UPI fees, instant settlement payment links.' },
                { id: 'phonepe', title: '📱 PhonePe PG', desc: 'Direct merchant payment gateway for PhonePe ecosystem and cards.' },
              ].map((g) => (
                <div
                  key={g.id}
                  onClick={() => setGateway({ ...gateway, activeGateway: g.id })}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: gateway.activeGateway === g.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: gateway.activeGateway === g.id ? 'rgba(200, 169, 126, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {g.title}
                    {gateway.activeGateway === g.id && <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{g.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Gateway Environment:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="env"
                  value="sandbox"
                  checked={gateway.environment === 'sandbox'}
                  onChange={() => setGateway({ ...gateway, environment: 'sandbox' })}
                />
                🧪 Test / Sandbox Mode
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="env"
                  value="live"
                  checked={gateway.environment === 'live'}
                  onChange={() => setGateway({ ...gateway, environment: 'live' })}
                />
                🟢 Live / Production Mode
              </label>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="card">
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Key size={18} style={{ color: 'var(--color-primary)' }} /> Merchant API Keys & Identifiers
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">UPI VPA ID (For Direct Payments)</label>
                <input
                  type="text"
                  className="input"
                  value={gateway.upiId || ''}
                  onChange={(e) => setGateway({ ...gateway, upiId: e.target.value })}
                  placeholder="thebharmalskitchen@icici"
                />
              </div>

              <div>
                <label className="label">Merchant Brand Display Name</label>
                <input
                  type="text"
                  className="input"
                  value={gateway.merchantName || ''}
                  onChange={(e) => setGateway({ ...gateway, merchantName: e.target.value })}
                  placeholder="The Bharmals Kitchen Fort"
                />
              </div>

              <div>
                <label className="label">Razorpay Key ID</label>
                <input
                  type="text"
                  className="input"
                  value={gateway.razorpayKeyId || ''}
                  onChange={(e) => setGateway({ ...gateway, razorpayKeyId: e.target.value })}
                  placeholder="rzp_test_... or rzp_live_..."
                />
              </div>

              <div>
                <label className="label">Razorpay Key Secret</label>
                <input
                  type="password"
                  className="input"
                  value={gateway.razorpayKeySecret || ''}
                  onChange={(e) => setGateway({ ...gateway, razorpayKeySecret: e.target.value })}
                  placeholder="Enter secret from Razorpay Dashboard"
                />
              </div>

              <div>
                <label className="label">Cashfree App ID (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={gateway.cashfreeAppId || ''}
                  onChange={(e) => setGateway({ ...gateway, cashfreeAppId: e.target.value })}
                  placeholder="CF12345..."
                />
              </div>

              <div>
                <label className="label">PhonePe Merchant ID (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={gateway.phonepeMerchantId || ''}
                  onChange={(e) => setGateway({ ...gateway, phonepeMerchantId: e.target.value })}
                  placeholder="MERCHANTUAT..."
                />
              </div>
            </div>
          </div>

          {/* Setup Guide Step-by-Step */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} /> Where and How to Add Your Payment Gateway
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Follow these simple steps to start receiving customer online payments directly into your restaurant bank account:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <strong>Step 1: Free Direct UPI (Fastest & 0% Deductions)</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '12px' }}>
                  If you already have a Google Pay for Business, Paytm QR, or ICICI/HDFC Current Account UPI VPA, enter it in the <strong>UPI VPA ID</strong> field above and choose <strong>Direct UPI</strong>. Every customer order generates an instant QR code. Payments land directly in your bank account with zero platform fees.
                </p>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <strong>Step 2: Razorpay Account Setup (For Card & Auto-Verification)</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '12px' }}>
                  1. Go to <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>razorpay.com</a> and sign up with your business documents (GSTIN/FSSAI).<br />
                  2. Open <strong>Settings &gt; API Keys</strong> and click <strong>Generate Key</strong>.<br />
                  3. Copy your <code>Key ID</code> and <code>Key Secret</code> into the fields above.<br />
                  4. Switch to <strong>Live / Production Mode</strong> when ready to accept real customer cards!
                </p>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <strong>Step 3: Webhook Verification</strong>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '12px' }}>
                  When customers pay, payments are automatically confirmed and synced directly to the Kitchen Display System (KDS) and Cashier active orders table in real time with an audio alert.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> Save Gateway Configuration
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
