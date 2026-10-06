/**
 * Discounts & Promotions Manager
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Reads promotions from Firebase-synced dataService.
 */

import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { getPromotions } from '../../services/dataService';
import toast from 'react-hot-toast';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);

  const loadPromotions = () => {
    setPromotions(getPromotions());
  };

  useEffect(() => {
    loadPromotions();
    const handleUpdate = () => loadPromotions();
    window.addEventListener('tbk_promotions_updated', handleUpdate);
    return () => window.removeEventListener('tbk_promotions_updated', handleUpdate);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Discounts & Coupon Promotions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Configure POS coupon codes, flat bill discounts, percentage off rules, and usage caps.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Offer Title</th>
                <th>Discount Benefit</th>
                <th>Min Bill Value</th>
                <th>Max Discount Cap</th>
                <th>Total Times Redeemed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                    No promotions configured yet.
                  </td>
                </tr>
              ) : (
                promotions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '800', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                      {p.code}
                    </td>
                    <td style={{ fontWeight: '600' }}>{p.title}</td>
                    <td>
                      <span className="badge badge-success">
                        {p.discountType === 'percentage' ? `${p.value}% OFF` : `₹${p.value} FLAT`}
                      </span>
                    </td>
                    <td>₹{p.minBill}</td>
                    <td>₹{p.maxDiscount}</td>
                    <td style={{ fontWeight: '600' }}>{p.uses} Redemptions</td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
