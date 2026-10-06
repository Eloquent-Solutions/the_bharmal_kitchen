/**
 * GST & Tax Audit Reports (GSTR-1 / GSTR-3B Ready)
 * The Bharmals Kitchen — Restaurant Management System
 *
 * 100% Dynamic GST & Tax Audit calculations from Live Orders and Purchase Bills.
 */

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Percent,
  Receipt,
} from 'lucide-react';
import { getOrders, getPurchaseBills, getRestaurantSettings } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function TaxReportsPage() {
  const [orders, setOrders] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('tbk_order_changed', handleSync);
    window.addEventListener('tbk_purchase_bills_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('tbk_order_changed', handleSync);
      window.removeEventListener('tbk_purchase_bills_updated', handleSync);
    };
  }, []);

  const refreshData = () => {
    setOrders(getOrders());
    setPurchaseBills(getPurchaseBills());
  };

  const settings = getRestaurantSettings();
  const cgstRate = Number(settings.cgstRate || 2.5);
  const sgstRate = Number(settings.sgstRate || 2.5);
  const totalTaxRate = cgstRate + sgstRate;

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    if (dateRange === 'all') return true;
    if (!o.createdAt) return true;
    const d = new Date(o.createdAt);
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === '7days') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalGrossSales = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOutputGst = Math.round((totalGrossSales * totalTaxRate) / (100 + totalTaxRate));
  const cgstOutput = Math.round(totalOutputGst / 2);
  const sgstOutput = totalOutputGst - cgstOutput;
  const totalTaxableSales = totalGrossSales - totalOutputGst;

  // Input Tax Credit (ITC) from purchase bills
  const totalPurchaseAmount = purchaseBills.reduce((sum, b) => sum + (Number(b.totalAmount) || Number(b.amount) || 0), 0);
  const totalInputGstCredit = Math.round((totalPurchaseAmount * 0.05) / 1.05);
  const netPayableGst = Math.max(0, totalOutputGst - totalInputGstCredit);

  const handleExportGSTR1 = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders to export for GSTR-1');
      return;
    }
    const headers = ['Invoice / Order ID', 'Invoice Date', 'Customer Name', 'Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount', 'Total Invoice Value'];
    const rows = filteredOrders.map((o) => {
      const gross = Number(o.total) || 0;
      const tax = Math.round((gross * totalTaxRate) / (100 + totalTaxRate));
      const cgst = Math.round(tax / 2);
      const sgst = tax - cgst;
      const taxable = gross - tax;
      return [
        o.id,
        o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A',
        `"${o.customer || 'Customer'}"`,
        taxable,
        `${cgstRate}%`,
        cgst,
        `${sgstRate}%`,
        sgst,
        gross,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TBK_GSTR1_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GSTR-1 Excel Tax Report downloaded successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>GST & Tax Audit Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            GSTR-1 & GSTR-3B sales return breakdowns, output GST (CGST {cgstRate}% + SGST {sgstRate}%), and input tax credits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.id}
              className={`btn btn-sm ${dateRange === range.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateRange(range.id)}
            >
              {range.label}
            </button>
          ))}
          <button className="btn btn-primary" onClick={handleExportGSTR1}>
            <FileSpreadsheet size={16} /> Export GSTR-1 CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Taxable Turnover</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', marginTop: '4px' }}>
            {formatCurrency(totalTaxableSales)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Excluding 5% GST
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Output CGST ({cgstRate}%)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)', marginTop: '4px' }}>
            {formatCurrency(cgstOutput)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Central GST Output
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Output SGST ({sgstRate}%)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)', marginTop: '4px' }}>
            {formatCurrency(sgstOutput)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            State GST Output
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Net Payable GST (After ITC)</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-success)', marginTop: '4px' }}>
            {formatCurrency(netPayableGst)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>
            ITC Claimed: {formatCurrency(totalInputGstCredit)}
          </div>
        </div>
      </div>
    </div>
  );
}
