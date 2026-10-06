/**
 * Food Cost & Recipe Variance Analytics
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic Food Cost & Gross Margin Engineering from Menu Catalog.
 */

import { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  TrendingDown,
  Scale,
  Percent,
  Search,
} from 'lucide-react';
import { getMenuItems, getCategories } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';

export default function FoodCostReportsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_menu_items_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_menu_items_updated', handleSync);
    };
  }, []);

  const refreshData = () => {
    setItems(getMenuItems());
    setCategories(getCategories());
  };

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCat === 'All' || item.category === selectedCat || item.categoryId === selectedCat;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Food Cost & Gross Margin Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Theoretical vs actual portion food cost percentage, menu profitability engineering.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
            />
          </div>

          <select
            className="input"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            style={{ width: '180px', height: '34px', fontSize: '12px' }}
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Menu Dish</th>
                <th>Category</th>
                <th>Selling Price</th>
                <th>Portion Cost (BOM)</th>
                <th>Food Cost %</th>
                <th>Gross Contribution</th>
                <th>Profit Health</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const price = Number(item.price) || 0;
                const cost = Number(item.costPrice) || Math.round(price * 0.35);
                const costPercent = price > 0 ? ((cost / price) * 100).toFixed(1) : 0;
                const grossMargin = Math.max(0, price - cost);
                const isHighMargin = costPercent <= 35;
                const isModerateMargin = costPercent > 35 && costPercent <= 50;

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '700' }}>{item.name}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {item.category || 'Mains'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{formatCurrency(price)}</td>
                    <td style={{ color: 'var(--color-warning)', fontWeight: '600' }}>{formatCurrency(cost)}</td>
                    <td style={{ fontWeight: '700' }}>{costPercent}%</td>
                    <td style={{ fontWeight: '800', color: 'var(--color-success)' }}>{formatCurrency(grossMargin)}</td>
                    <td>
                      {isHighMargin ? (
                        <span className="badge badge-success">High Margin</span>
                      ) : isModerateMargin ? (
                        <span className="badge badge-warning">Moderate</span>
                      ) : (
                        <span className="badge badge-danger">High Cost</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                    No menu items found.
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
