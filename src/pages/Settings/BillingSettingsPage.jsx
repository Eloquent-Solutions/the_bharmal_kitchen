import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db, isDemoMode } from '../../firebase/config';
import { cacheRestaurantSettings, getRestaurantSettings } from '../../services/dataService';
import { saveSettingsCloud } from '../../services/settingsCloud';
import LoadingButton from '../../components/LoadingButton';

const emptySettings = {
  name: 'The Bharmals Kitchen', address: '', phone: '', email: '', gstin: '', fssai: '',
  cgstRate: 0, sgstRate: 0, serviceCharge: 0, roundOff: true,
};

const textFields = [
  ['name', 'Business name'], ['address', 'Receipt address'], ['phone', 'Contact phone'],
  ['email', 'Contact email'], ['gstin', 'GSTIN (if registered)'], ['fssai', 'FSSAI number'],
];

export default function BillingSettingsPage() {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const saved = isDemoMode ? getRestaurantSettings() : (await getDoc(doc(db, 'settings', 'restaurant'))).data();
        if (active && saved) setSettings({ ...emptySettings, ...saved });
      } catch (error) {
        if (active) toast.error(`Could not load billing settings: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function save(event) {
    event.preventDefault();
    const rates = ['cgstRate', 'sgstRate', 'serviceCharge'];
    if (!settings.name.trim() || rates.some((key) => settings[key] === '' || !Number.isFinite(Number(settings[key])) || Number(settings[key]) < 0 || Number(settings[key]) > 100)) {
      toast.error('Enter a business name and tax/charge percentages between 0 and 100.');
      return;
    }
    const next = {
      ...settings,
      ...Object.fromEntries(textFields.map(([key]) => [key, String(settings[key] || '').trim()])),
      ...Object.fromEntries(rates.map((key) => [key, Number(settings[key])])),
    };
    setSaving(true);
    try {
      if (!isDemoMode) await saveSettingsCloud('restaurant', Object.fromEntries([...textFields.map(([key]) => key), ...rates, 'roundOff'].map((key) => [key, next[key]])));
      cacheRestaurantSettings(next);
      toast.success('Billing settings saved. New bills will use these values.');
    } catch (error) {
      toast.error(`Billing settings were not saved: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="spinner" />;

  return <div style={{ maxWidth: 860, display: 'grid', gap: 'var(--space-5)' }}>
    <div>
      <h2>Billing & Receipt Settings</h2>
      <p style={{ color: 'var(--text-secondary)' }}>These details print on new POS receipts. Tax and charges apply to new bills only.</p>
    </div>
    <form className="card" onSubmit={save} style={{ display: 'grid', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
      <h3>Business details</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {textFields.map(([key, label]) => <label key={key} className="label">
          {label}
          <input className="input" type={key === 'email' ? 'email' : 'text'} required={key === 'name'} value={settings[key] || ''} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} />
        </label>)}
      </div>
      <h3>Bill calculation</h3>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Confirm tax rates with your accountant before saving them.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        {[['cgstRate', 'CGST (%)'], ['sgstRate', 'SGST (%)'], ['serviceCharge', 'Service charge (%)']].map(([key, label]) => <label key={key} className="label">
          {label}
          <input className="input" type="number" min="0" max="100" step="0.01" required value={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} />
        </label>)}
      </div>
      <label className="label" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={settings.roundOff !== false} onChange={(event) => setSettings({ ...settings, roundOff: event.target.checked })} />
        Round bill total to nearest rupee
      </label>
      <div><LoadingButton className="btn btn-primary" type="submit" loading={saving} loadingText="Saving billing settings…">Save Billing Settings</LoadingButton></div>
    </form>
  </div>;
}
