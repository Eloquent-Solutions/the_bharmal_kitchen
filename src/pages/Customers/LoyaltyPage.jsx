/**
 * Loyalty Program & Rewards Management
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Dynamically computes membership tier counts from active customer database.
 */

import { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  Gift,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { getCustomers } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const platinumCount = customers.filter((c) => c.tier === 'Platinum').length;
  const goldCount = customers.filter((c) => c.tier === 'Gold').length;
  const silverCount = customers.filter((c) => c.tier === 'Silver' || !c.tier).length;

  const tiers = [
    {
      tier: 'Platinum Bohra Circle',
      minSpend: 30000,
      pointsMultiplier: '1.5x (₹100 = 15 Pts)',
      perks: 'Complimentary Dessert on every visit, priority table reservation, chef special tastings, 15% smart card bonus.',
      membersCount: platinumCount,
    },
    {
      tier: 'Gold Gourmet',
      minSpend: 15000,
      pointsMultiplier: '1.2x (₹100 = 12 Pts)',
      perks: '10% birthday discount, priority seating during rush hours, 12% smart card bonus.',
      membersCount: goldCount,
    },
    {
      tier: 'Silver Diner',
      minSpend: 0,
      pointsMultiplier: '1.0x (₹100 = 10 Pts)',
      perks: 'Redeemable reward points on dine-in billing, standard 10% prepaid card recharge bonus.',
      membersCount: silverCount,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Loyalty Program & VIP Tiers</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Configure dining reward point tiers, customer cashback perks, and VIP privileges.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
        {tiers.map((t, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Award size={20} style={{ color: idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-warning)' : 'var(--text-secondary)' }} />
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{t.tier}</h3>
                </div>
                <span className="badge badge-primary">{t.membersCount} Active Members</span>
              </div>

              <div style={{ background: 'var(--bg-glass-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-xs)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Eligibility:</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(t.minSpend)}+ Lifetime Spend</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Points Earning:</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: '700' }}>{t.pointsMultiplier}</span>
                </div>
                <div style={{ marginTop: '4px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  <strong>Perks:</strong> {t.perks}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
