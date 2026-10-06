/**
 * Physical Stock Count & Variance Audits
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Loads raw materials from Firebase dataService for physical count reconciliation.
 */

import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { getRawMaterials, reconcileAllPhysicalStock, logAuditEvent } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function StockCountPage() {
  const [items, setItems] = useState([]);

  const loadItems = () => {
    const rawMaterials = getRawMaterials();
    // Map raw materials into audit-ready rows with system stock values
    const auditItems = rawMaterials.map((rm) => ({
      id: rm.id,
      name: rm.name,
      systemStock: Number(rm.currentStock) || 0,
      countedStock: Number(rm.currentStock) || 0, // default: matches system
      unit: rm.unit || 'kg',
      unitCost: Number(rm.unitCost) || 0,
    }));
    setItems(auditItems);
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener('tbk_raw_materials_updated', handleUpdate);
    return () => window.removeEventListener('tbk_raw_materials_updated', handleUpdate);
  }, []);

  const handleCountChange = (id, val) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, countedStock: Number(val) || 0 } : item))
    );
  };

  const handleReconcileAll = () => {
    reconcileAllPhysicalStock(items);
    loadItems();
    logAuditEvent({
      action: 'Physical Stock Reconciled',
      user: 'Manager',
      details: `Reconciled ${items.length} raw material items against physical count`,
      ip: 'Inventory Terminal',
    });
    toast.success('Physical count reconciled! Inventory system balances updated.');
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
        <button className="btn btn-primary" onClick={handleReconcileAll}>
          <Save size={16} /> Reconcile Stock Discrepancies
        </button>
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
                  const diff = item.countedStock - item.systemStock;
                  const diffVal = diff * item.unitCost;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{item.id}</td>
                      <td style={{ fontWeight: '700' }}>{item.name}</td>
                      <td>{item.systemStock} {item.unit}</td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          className="input"
                          value={item.countedStock}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          style={{ height: '34px', fontSize: 'var(--font-sm)', fontWeight: '700' }}
                        />
                      </td>
                      <td style={{ fontWeight: '700', color: diff === 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                        {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {item.unit}
                      </td>
                      <td style={{ fontWeight: '700', color: diffVal < 0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {diffVal === 0 ? '₹0.00' : `${diffVal < 0 ? '-' : '+'}₹${Math.abs(diffVal).toFixed(2)}`}
                      </td>
                      <td>
                        {diff === 0 ? (
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
