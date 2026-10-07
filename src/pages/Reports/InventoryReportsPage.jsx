/**
 * Inventory Valuation & Stock Turnover Reports
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic Inventory Valuation from Live Raw Materials.
 */

import { useState, useEffect } from 'react';
import { getRawMaterials } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';

export default function InventoryReportsPage() {
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_raw_materials_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_raw_materials_updated', handleSync);
    };
  }, []);

  const refreshData = () => {
    setMaterials(getRawMaterials());
  };

  // Group materials by Category
  const categoryMap = {};
  let totalValuation = 0;
  let lowStockCount = 0;

  materials.forEach((m) => {
    const cat = m.category || 'Dry Groceries & Spices';
    const unitPrice = Number(m.unitCost) || 0;
    const currentStock = Number(m.currentStock) || 0;
    const itemValuation = currentStock * unitPrice;
    totalValuation += itemValuation;

    if (currentStock <= Number(m.reorderLevel ?? 0)) {
      lowStockCount += 1;
    }

    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        itemsCount: 0,
        valuation: 0,
      };
    }
    categoryMap[cat].itemsCount += 1;
    categoryMap[cat].valuation += itemValuation;
  });

  const categoryRows = Object.values(categoryMap).map((cat) => ({
    ...cat,
    share: totalValuation > 0 ? `${Math.round((cat.valuation / totalValuation) * 100)}%` : '0%',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Inventory Valuation Report</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
          Current raw material value and category distribution based on each material's unit cost.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Inventory Asset Valuation</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>
            {formatCurrency(totalValuation)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Current locked storage capital
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Active Stock SKUs</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {materials.length} Raw Materials
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across {categoryRows.length} Categories
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Low Stock Reorder Alerts</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)', marginTop: '4px' }}>
            {lowStockCount} Items
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px' }}>
            Below safety buffer threshold
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Material Items</th>
                <th>Current Stock Asset Valuation</th>
                <th>Share of Storage Capital</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((inv, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '700' }}>{inv.category}</td>
                  <td>{inv.itemsCount} SKUs</td>
                  <td style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{formatCurrency(inv.valuation)}</td>
                  <td>
                    <span className="badge badge-neutral">{inv.share}</span>
                  </td>
                </tr>
              ))}
              {categoryRows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                    No raw materials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
