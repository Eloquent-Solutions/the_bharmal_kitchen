/**
 * Print Routing Rules Matrix
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Full Firestore synchronization for automated kitchen print routing.
 */

import { useState, useEffect } from 'react';
import {
  Share2,
  Printer,
  Save,
  CheckCircle2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  getPrintRouting,
  savePrintRouting,
  getPrinters,
  logAuditEvent,
} from '../../services/dataService';
import toast from 'react-hot-toast';

export default function PrintRoutingPage() {
  const [routes, setRoutes] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setRoutes(getPrintRouting());
    setPrinters(getPrinters());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('tbk_print_routing_updated', handleUpdate);
    window.addEventListener('tbk_printers_updated', handleUpdate);
    return () => {
      window.removeEventListener('tbk_print_routing_updated', handleUpdate);
      window.removeEventListener('tbk_printers_updated', handleUpdate);
    };
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      savePrintRouting(routes);
      logAuditEvent({
        action: 'Print Routing Updated',
        user: 'Administrator',
        details: `Saved ${routes.length} category print routing rules to Firestore`,
        ip: 'Print Console',
      });
      toast.success('Print routing rules saved to Firebase!');
    } catch (err) {
      toast.error('Failed to save print routing: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateRoute = (index, field, value) => {
    setRoutes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const printerOptions = printers.length > 0
    ? printers.map((p) => p.name)
    : [
        'Cashier Main POS Printer',
        'Tandoor Station KOT Printer',
        'Handi & Biryani KOT Printer',
        'Beverages & Dessert Bar Printer',
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>KOT Print Routing Matrix</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Automatically dispatch station-specific food tickets to kitchen printers based on menu category.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Routing Rules'}
        </button>
      </div>

      {/* Routing Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Category / Stream</th>
                <th>Primary Thermal Printer</th>
                <th>Failover Backup Printer</th>
                <th>KOT Copies</th>
                <th style={{ textAlign: 'center' }}>Trigger KOT</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '700', fontSize: 'var(--font-base)' }}>
                    {r.category}
                  </td>
                  <td>
                    <select
                      className="input"
                      value={r.primaryPrinter}
                      onChange={(e) => updateRoute(i, 'primaryPrinter', e.target.value)}
                      style={{ fontSize: 'var(--font-xs)', height: '34px' }}
                    >
                      {printerOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input"
                      value={r.backupPrinter}
                      onChange={(e) => updateRoute(i, 'backupPrinter', e.target.value)}
                      style={{ fontSize: 'var(--font-xs)', height: '34px' }}
                    >
                      {printerOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ width: '100px' }}>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      className="input"
                      value={r.copies}
                      onChange={(e) => updateRoute(i, 'copies', Number(e.target.value))}
                      style={{ fontSize: 'var(--font-xs)', height: '34px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={r.printOnKOT}
                      onChange={(e) => updateRoute(i, 'printOnKOT', e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
