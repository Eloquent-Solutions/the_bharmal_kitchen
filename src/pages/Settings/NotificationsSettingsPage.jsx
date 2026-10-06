/**
 * Notification Settings Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full Firestore synchronization for real-time order alerts,
 * kitchen chimes, low inventory warnings, and WhatsApp/Email dispatch.
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Save,
  Play,
  Flame,
  Shield,
} from 'lucide-react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  logAuditEvent,
} from '../../services/dataService';
import {
  playSwiggyZomatoTone,
  requestNotificationPermission,
} from '../../services/notificationService';
import toast from 'react-hot-toast';

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState({
    browserPushNotifications: true,
    soundAlertsEnabled: true,
    soundVolume: 80,
    swiggyZomatoTone: true,
    whatsappOrderUpdates: false,
    whatsappAdminNumber: '+91 98200 12345',
    lowStockAlerts: true,
    lowStockThreshold: 5,
    dailySalesSummaryEmail: false,
    summaryEmailRecipient: 'owner@thebharmalskitchen.com',
    soundOnNewOrder: true,
    soundOnKdsBump: false,
  });

  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');

  useEffect(() => {
    const loaded = getNotificationSettings();
    if (loaded) {
      setSettings((prev) => ({ ...prev, ...loaded }));
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleTestSound = () => {
    try {
      playSwiggyZomatoTone();
      toast.success('Playing Kitchen Order incoming alert chime');
    } catch {
      toast.error('Audio playback failed in current browser context');
    }
  };

  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      toast.success('Browser notification permission enabled!');
    } else {
      setPermissionStatus('denied');
      toast.error('Permission not granted by browser.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveNotificationSettings(settings);
      logAuditEvent({
        action: 'Notification Settings Updated',
        user: 'Administrator',
        details: 'Updated operational sound chimes, push alerts, and low stock dispatch configurations',
        ip: 'Settings Console',
      });
      toast.success('Notification settings saved to Firebase!');
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Notification & Alert Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Configure real-time kitchen audio chimes, browser push alerts, and inventory stock warnings.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Audio & Kitchen Chimes */}
      <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <Volume2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Kitchen Audio Chimes & Sound Alerts</h3>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                Audible sound played immediately when an online customer or POS cashier fires an order.
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleTestSound}>
            <Play size={14} /> Test Chime
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Enable Audio Chimes</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Play sound on new incoming orders</div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundAlertsEnabled}
              onChange={() => handleToggle('soundAlertsEnabled')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Aggressive Delivery Bell (Swiggy / Zomato Style)</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>High-resonance alert sound designed for loud commercial Bohra handi kitchens</div>
            </div>
            <input
              type="checkbox"
              checked={settings.swiggyZomatoTone}
              onChange={() => handleToggle('swiggyZomatoTone')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Alert on Kitchen Station Bump (KDS Done)</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Chime when a cook marks dish as ready on station screen</div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundOnKdsBump}
              onChange={() => handleToggle('soundOnKdsBump')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Browser Push Notifications */}
      <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Bell size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Browser Desktop Push Notifications</h3>
              <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                System notifications that show up even when you are on another browser tab or minimized.
              </p>
            </div>
          </div>
          {permissionStatus !== 'granted' && (
            <button className="btn btn-secondary btn-sm" onClick={handleRequestPush}>
              Grant Permission
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Push Alerts on New Orders</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Browser notification permission status: <strong>{permissionStatus}</strong></div>
            </div>
            <input
              type="checkbox"
              checked={settings.browserPushNotifications}
              onChange={() => handleToggle('browserPushNotifications')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Inventory & Low Stock Alerts */}
      <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>Inventory & Raw Material Stock Alerts</h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              Warn chefs and inventory managers before critical ingredients run out.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Low Stock Warning Banner</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Flag materials reaching minimum reorder threshold in POS and Inventory</div>
            </div>
            <input
              type="checkbox"
              checked={settings.lowStockAlerts}
              onChange={() => handleToggle('lowStockAlerts')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Default Alert Threshold (kg / units)</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Trigger warning when stock drops below this value</div>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: '120px' }}
              value={settings.lowStockThreshold}
              onChange={(e) => handleChange('lowStockThreshold', Number(e.target.value) || 0)}
              min="1"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp & Email Dispatch */}
      <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Smartphone size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-base)', fontWeight: '700' }}>WhatsApp & Email Notifications</h3>
            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
              Send automatic bill receipts to customers and daily closing summaries to restaurant owners.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>WhatsApp Customer Order Updates</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Send live tracking link and digital bill via WhatsApp Business API</div>
            </div>
            <input
              type="checkbox"
              checked={settings.whatsappOrderUpdates}
              onChange={() => handleToggle('whatsappOrderUpdates')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: 'var(--font-sm)' }}>Daily End of Day Sales Summary Email</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Automatically send daily Z-Report PDF & revenue metrics to owner</div>
            </div>
            <input
              type="checkbox"
              checked={settings.dailySalesSummaryEmail}
              onChange={() => handleToggle('dailySalesSummaryEmail')}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
          </div>

          {settings.dailySalesSummaryEmail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: '600' }}>Owner / Manager Recipient Email</label>
              <input
                type="email"
                className="input"
                value={settings.summaryEmailRecipient}
                onChange={(e) => handleChange('summaryEmailRecipient', e.target.value)}
                placeholder="owner@thebharmalskitchen.com"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
