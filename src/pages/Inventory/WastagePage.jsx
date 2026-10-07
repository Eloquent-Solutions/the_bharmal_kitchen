/**
 * Kitchen Spoilage & Wastage Log
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Reads from Firebase-synced wastage collection via dataService.
 */

import { useState, useEffect } from 'react';
import {
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate, formatRecordId } from '../../utils/formatters';
import { getWastageLogs, saveWastageLog, getRawMaterials } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function WastagePage() {
  const [wastage, setWastage] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWastage, setNewWastage] = useState({
    materialId: '',
    qty: 1,
    reason: '',
  });

  const loadWastage = () => {
    setWastage(getWastageLogs());
    setMaterials(getRawMaterials());
  };

  useEffect(() => {
    loadWastage();
    const handleUpdate = () => loadWastage();
    window.addEventListener('tbk_wastage_updated', handleUpdate);
    window.addEventListener('tbk_raw_materials_updated', handleUpdate);
    return () => {
      window.removeEventListener('tbk_wastage_updated', handleUpdate);
      window.removeEventListener('tbk_raw_materials_updated', handleUpdate);
    };
  }, []);

  const handleAddWastage = (e) => {
    e.preventDefault();
    try {
      saveWastageLog({ ...newWastage, loggedBy: 'Current User' });
      setIsModalOpen(false);
      setNewWastage({ materialId: '', qty: 1, reason: '' });
      loadWastage();
      toast.success('Wastage recorded and deducted from stock.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalWastageCost = wastage.reduce((s, w) => s + (w.cost || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Kitchen Wastage & Spoilage Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Track trimming loss, storage spoilage, kitchen errors, and end-of-day surplus write-offs.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Record Wastage
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Wastage Loss</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(totalWastageCost)}
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Wastage Log Entries</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {wastage.length} Events
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Voucher #</th>
                <th>Date</th>
                <th>Raw Material / Item</th>
                <th>Wasted Qty</th>
                <th>Loss Value (₹)</th>
                <th>Reason / Root Cause</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {wastage.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No wastage records found. Use "Record Wastage" to log spoilage events.
                  </td>
                </tr>
              ) : (
                wastage.map((w) => (
                  <tr key={w.id}>
                    <td title={w.id} style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{formatRecordId(w.id)}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{formatDate(w.date)}</td>
                    <td style={{ fontWeight: '700' }}>{w.material}</td>
                    <td style={{ fontWeight: '600' }}>{w.qty} {w.unit}</td>
                    <td style={{ fontWeight: '800', color: 'var(--color-danger)' }}>{formatCurrency(w.cost)}</td>
                    <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{w.reason}</td>
                    <td style={{ fontSize: 'var(--font-xs)' }}>{w.loggedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>Log Wastage Event</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddWastage} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Raw Material</label>
                <select
                  className="input"
                  required
                  value={newWastage.materialId}
                  onChange={(e) => setNewWastage({ ...newWastage, materialId: e.target.value })}
                >
                  <option value="">Select raw material</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>{material.name} — {material.currentStock} {material.unit} available</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Wasted Quantity ({materials.find((m) => m.id === newWastage.materialId)?.unit || 'unit'})</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    className="input"
                    required
                    value={newWastage.qty}
                    onChange={(e) => setNewWastage({ ...newWastage, qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Estimated Loss (₹)</label>
                  <div className="input" style={{ display: 'flex', alignItems: 'center' }}>
                    {formatCurrency((Number(newWastage.qty) || 0) * (materials.find((m) => m.id === newWastage.materialId)?.unitCost || 0))}
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Root Cause / Reason</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Storage spoilage, cooking mistake"
                  value={newWastage.reason}
                  onChange={(e) => setNewWastage({ ...newWastage, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Wastage Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
