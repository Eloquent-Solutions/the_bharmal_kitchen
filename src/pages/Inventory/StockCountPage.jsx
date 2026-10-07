/**
 * Physical Stock Count & Variance Audits
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Loads raw materials from Firebase dataService for physical count reconciliation.
 */

import { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Search,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { getRawMaterials, reconcileAllPhysicalStock, logAuditEvent } from '../../services/dataService';
import { formatRecordId } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { isDemoMode, isInventoryOnly } from '../../firebase/config';
import { reconcilePhysicalStockCloud } from '../../services/inventoryCloud';

export default function StockCountPage() {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const countTouched = useRef(false);

  const loadItems = () => {
    countTouched.current = false;
    const rawMaterials = getRawMaterials();
    // Map raw materials into audit-ready rows with system stock values
    const auditItems = rawMaterials.map((rm) => ({
      id: rm.id,
      name: rm.name,
      systemStock: Number(rm.currentStock) || 0,
      countedStock: String(Number(rm.currentStock) || 0), // default: matches system
      unit: rm.unit || 'kg',
      unitCost: Number(rm.unitCost) || 0,
    }));
    setItems(auditItems);
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => {
      if (!countTouched.current) loadItems();
    };
    window.addEventListener('tbk_raw_materials_updated', handleUpdate);
    return () => window.removeEventListener('tbk_raw_materials_updated', handleUpdate);
  }, []);

  const handleCountChange = (id, val) => {
    countTouched.current = true;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, countedStock: val } : item))
    );
  };

  const handleReconcileAll = async () => {
    setSaving(true);
    try {
      if (isInventoryOnly && !isDemoMode) {
        await reconcilePhysicalStockCloud(items);
      } else {
        reconcileAllPhysicalStock(items);
        logAuditEvent({
          action: 'Physical Stock Reconciled',
          user: 'Manager',
          details: `Reconciled ${items.length} raw material items against physical count`,
          ip: 'Inventory Terminal',
        });
      }
      loadItems();
      toast.success('Physical count reconciled! Inventory system balances updated.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Physical Stock Audit & Count</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Conduct physical inventory checks, verify discrepancies, and reconcile actual stock balances.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={loadItems}>
            <RotateCcw size={16} /> Reload Current Stock
          </button>
          <button className="btn btn-primary" onClick={handleReconcileAll} disabled={saving}>
            <Save size={16} /> Reconcile Stock Discrepancies
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material Name</th>
                <th>System Stock</th>
                <th style={{ width: '160px' }}>Actual Counted Stock</th>
                <th>Variance (Qty)</th>
                <th>Variance Value (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No raw materials found. Add materials in Inventory → Raw Materials first.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const invalid = item.countedStock === '' || !Number.isFinite(Number(item.countedStock)) || Number(item.countedStock) < 0;
                  const diff = item.countedStock === '' ? 0 : Number(item.countedStock) - item.systemStock;
                  const diffVal = diff * item.unitCost;

                  return (
                    <tr key={item.id}>
                      <td title={item.id} style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{formatRecordId(item.id)}</td>
                      <td style={{ fontWeight: '700' }}>{item.name}</td>
                      <td>{item.systemStock} {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          className="input"
                          value={item.countedStock}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          style={{ height: '34px', fontSize: 'var(--font-sm)', fontWeight: '700' }}
                        />
                      </td>
                      <td style={{ fontWeight: '700', color: diff === 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                        {invalid ? 'Enter count' : `${diff > 0 ? '+' : ''}${Number(diff.toFixed(3))} ${item.unit}`}
                      </td>
                      <td style={{ fontWeight: '700', color: diffVal < 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {invalid ? '—' : diffVal === 0 ? '₹0.00' : `${diffVal < 0 ? '-' : '+'}₹${Math.abs(diffVal).toFixed(2)}`}
                      </td>
                      <td>
                        {invalid ? (
                          <span className="badge badge-warning">Enter count</span>
                        ) : diff === 0 ? (
                          <span className="badge badge-success">Matched</span>
                        ) : (
                          <span className="badge badge-danger">Discrepancy</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
