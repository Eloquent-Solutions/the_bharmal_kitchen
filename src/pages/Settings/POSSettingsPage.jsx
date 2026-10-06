/**
 * POS Terminal Settings & Behaviors
 * The Bharmals Kitchen — Restaurant Management System
 */

import { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  ShoppingCart,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { getPOSSettings, savePOSSettings } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function POSSettingsPage() {
  const [settings, setSettings] = useState(getPOSSettings());

  useEffect(() => {
    setSettings(getPOSSettings());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    savePOSSettings(settings);
    toast.success('POS operational rules saved and synced with Firebase!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>POS Terminal Configuration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Configure billing terminal workflows, automated KOT triggers, sound effects, and payment defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            { id: 'autoPrintKOTOnOrder', label: 'Automatically Dispatch KOT to Kitchen on Cart Submission', desc: 'Fires ESC/POS print jobs instantly when cashier or steward places an order.' },
            { id: 'requireTableNumberForDineIn', label: 'Enforce Table Selection for Dine-In Orders', desc: 'Prevents placing dine-in orders without assigning a physical table.' },
            { id: 'allowCustomItemDiscounts', label: 'Allow Item-Level Manager Discounts in POS Cart', desc: 'Permits applying authorized discounts on individual line items.' },
            { id: 'askCustomerPhoneOnCheckout', label: 'Prompt for Guest Phone Number for Loyalty Points', desc: 'Automatically queries CRM customer directory when taking orders.' },
            { id: 'enableSoundOnCartAdd', label: 'Enable Tactile Sound Effect on Item Tap', desc: 'Provides auditory feedback to cashiers during rapid rush-hour item adding.' },
          ].map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--bg-glass-subtle)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={settings[item.id]}
                onChange={(e) => setSettings({ ...settings, [item.id]: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: '700', fontSize: 'var(--font-sm)' }}>{item.label}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save POS Behavior Rules
          </button>
        </div>
      </form>
    </div>
  );
}
