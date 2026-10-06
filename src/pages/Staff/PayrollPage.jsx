/**
 * Monthly Staff Payroll Engine
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Dynamically computes net salary:
 *  - Base monthly salary
 *  - Deductions for Unpaid Leaves (unpaid leave days are deducted based on daily wage)
 *  - Advances recovery
 *  - Incentives / bonus
 */

import { useState, useEffect } from 'react';
import {
  DollarSign,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Users,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { calculatePayroll, getStaff } from '../../services/dataService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('September 2026');

  useEffect(() => {
    const refreshData = () => setPayroll(calculatePayroll(selectedMonth));
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [selectedMonth]);

  const totalPayout = payroll.reduce((sum, p) => sum + p.netPay, 0);
  const totalAdvancesRecovered = payroll.reduce((sum, p) => sum + p.advanceDeduction, 0);
  const totalLeaveDeductions = payroll.reduce((sum, p) => sum + (p.leaveDeduction || 0), 0);

  const handlePrintSlip = (staff) => {
    toast.success(`Generated Official Payslip for ${staff.name} — Net Payable: ${formatCurrency(staff.netPay)}`);
  };

  const handleExportExcel = () => {
    toast.success('Downloading Payroll Salary Sheet (.xlsx)...');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Monthly Payroll & Salary Computation</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Unpaid-leave adjusted salaries, advance deductions, service incentives, and salary payslips.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={handleExportExcel}>
            <FileSpreadsheet size={16} /> Export Salary Sheet
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Total Monthly Payout</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-primary)', marginTop: '4px' }}>
            {formatCurrency(totalPayout)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            For {payroll.length} Employees ({selectedMonth})
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--color-warning)' }}>Unpaid Leave Deductions</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-warning)', marginTop: '4px' }}>
            {formatCurrency(totalLeaveDeductions)}
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Auto-deducted from unpaid days
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>Advances Recovered</div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: '800', color: 'var(--color-danger)', marginTop: '4px' }}>
            {formatCurrency(totalAdvancesRecovered)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {payroll.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--text-tertiary)' }}>
            <Users size={48} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
            <p>No active staff found to generate payroll for.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Base Salary</th>
                  <th>Unpaid Leaves</th>
                  <th>Leave Deduction</th>
                  <th>Advances</th>
                  <th>Incentives</th>
                  <th>Net Payable</th>
                  <th style={{ textAlign: 'right' }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700' }}>{p.name}</td>
                    <td>
                      <span className="badge badge-neutral">{p.role}</span>
                    </td>
                    <td>{formatCurrency(p.baseSalary)}</td>
                    <td>
                      {p.unpaidLeaveDays > 0 ? (
                        <span className="badge badge-warning">{p.unpaidLeaveDays} Day(s)</span>
                      ) : (
                        <span className="badge badge-success">0 Days</span>
                      )}
                    </td>
                    <td style={{ color: p.leaveDeduction > 0 ? 'var(--color-warning)' : 'var(--text-tertiary)', fontWeight: '600' }}>
                      {p.leaveDeduction > 0 ? `-${formatCurrency(p.leaveDeduction)}` : '—'}
                    </td>
                    <td style={{ color: p.advanceDeduction > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)', fontWeight: '600' }}>
                      {p.advanceDeduction > 0 ? `-${formatCurrency(p.advanceDeduction)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--color-success)', fontWeight: '600' }}>
                      +{formatCurrency(p.bonus)}
                    </td>
                    <td style={{ fontWeight: '800', fontSize: 'var(--font-base)', color: 'var(--text-primary)' }}>
                      {formatCurrency(p.netPay)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handlePrintSlip(p)}
                        title="Print Payslip"
                      >
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
