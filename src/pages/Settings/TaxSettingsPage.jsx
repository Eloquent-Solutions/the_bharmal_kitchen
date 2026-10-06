/**
 * Tax & GST Engine Configuration
 * The Bharmals Kitchen — Restaurant Management System
 */

import { useState, useEffect } from 'react';
import {
  Percent,
  Save,
  CheckCircle2,
  Building,
} from 'lucide-react';
import { getRestaurantSettings, saveRestaurantSettings } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function TaxSettingsPage() {
  const [taxConfig, setTaxConfig] = useState(getRestaurantSettings());

  useEffect(() => {
    setTaxConfig(getRestaurantSettings());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    saveRestaurantSettings(taxConfig);
    toast.success('Tax & GST engine settings updated and synced with Firebase!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Tax & GST Configuration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Configure GSTIN tax rates, CGST/SGST splits, service charge percentage, and round-off rounding logic.
        </p>
      </div>

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <label className="label">Registered GSTIN Number</label>
            <input
              type="text"
              className="input"
              value={taxConfig.gstin}
              onChange={(e) => setTaxConfig({ ...taxConfig, gstin: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Legal Tax Entity Name</label>
            <input
              type="text"
              className="input"
              value={taxConfig.legalEntityName}
              onChange={(e) => setTaxConfig({ ...taxConfig, legalEntityName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Central GST (CGST %)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={taxConfig.cgstRate}
              onChange={(e) => setTaxConfig({ ...taxConfig, cgstRate: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="label">State GST (SGST %)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={taxConfig.sgstRate}
              onChange={(e) => setTaxConfig({ ...taxConfig, sgstRate: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="label">Service Charge (%)</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={taxConfig.serviceChargePercent}
              onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargePercent: Number(e.target.value) })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save Tax Engine Rules
          </button>
        </div>
      </form>
    </div>
  );
}
