import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { businessDate, validBusinessDate, buildFinanceReport, expectedShiftCash, financeCsv } from '../src/utils/finance.js';
import { buildDayCloseHtml } from '../src/utils/financePrint.js';

test('business dates follow Rajkot midnight and reject invalid calendar dates', () => {
  assert.equal(businessDate('2026-10-27T18:29:59Z'), '2026-10-27');
  assert.equal(businessDate('2026-10-27T18:30:00Z'), '2026-10-28');
  assert.equal(validBusinessDate('2026-02-30'), false);
  assert.equal(validBusinessDate('2026-02-28'), true);
  assert.equal(businessDate('not-a-date'), '');
});

test('cash reconciliation includes cash only and handles reversals', () => {
  assert.equal(expectedShiftCash({ openingCash: 500, cashSales: 105, upiSales: 1000, cashIn: 50, cashOut: 20, cashExpenses: 40, supplierCash: 60 }), 535);
});

test('sales, collections and historical tax stay on their recorded dates', () => {
  const orders = [
    { id: 'a', businessDate: '2026-10-27', paidAt: '2026-10-28T10:00:00Z', paymentStatus: 'paid', paymentMethod: 'cash', taxableAmount: 100, total: 105, cgst: 2.5, sgst: 2.5, costComplete: true, ingredientCost: 20 },
    { id: 'b', businessDate: '2026-10-28', createdAt: '2026-10-28T10:00:00Z', paymentStatus: 'pending', paymentMethod: 'cash', taxableAmount: 200, total: 200, cgst: 0, sgst: 0, costComplete: true, ingredientCost: 40 },
  ];
  const report = buildFinanceReport({ orders }, '2026-10-28', '2026-10-28');
  assert.equal(report.grossSales, 200);
  assert.equal(report.collected, 105);
  assert.equal(report.outstanding, 200);
  assert.equal(report.cgst, 0);
  assert.equal(report.estimatedProfit, 160);
});

test('profit is incomplete for missing costs or tax; purchases are not double-counted', () => {
  const order = { id: 'a', businessDate: '2026-10-28', total: 100, taxableAmount: 100, cgst: 0, sgst: 0, costComplete: true, ingredientCost: 20 };
  const report = buildFinanceReport({ orders: [order], purchaseBills: [{ totalAmount: 5000 }],
    expenses: [{ businessDate: '2026-10-28', amount: 10 }, { businessDate: '2026-10-28', amount: 50, status: 'void' }],
    wastage: [{ date: '2026-10-28', cost: 5 }] }, '2026-10-28', '2026-10-28');
  assert.equal(report.estimatedProfit, 65);
  assert.equal(buildFinanceReport({ orders: [{ ...order, costComplete: false }] }, '2026-10-28', '2026-10-28').estimatedProfit, null);
  assert.equal(buildFinanceReport({ orders: [{ ...order, cgst: undefined }] }, '2026-10-28', '2026-10-28').estimatedProfit, null);
  assert.equal(buildFinanceReport({ orders: [order], wastage: [{ date: '2026-10-28', cost: 0 }] }, '2026-10-28', '2026-10-28').estimatedProfit, null);
});

test('saved day-close print output escapes names and keeps the recorded counts', () => {
  const html = buildDayCloseHtml({ schemaVersion: 2, businessDate: '2026-10-28', createdBy: '<script>bad</script>',
    grossSales: 105, cgst: 2.5, sgst: 2.5, shifts: [{ shiftName: '<img src=x>', expectedCash: 545, actualCash: 545, variance: 0 }] });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('INR 545.00'));
  assert.throws(() => buildDayCloseHtml({}), /saved day close/);
});

test('payment ledger prevents double counting; cancelled ingredient usage remains a cost', () => {
  const report = buildFinanceReport({ orders: [{ id: 'a', businessDate: '2026-10-28', status: 'cancelled', total: 100, paymentStatus: 'paid', paymentEntryId: 'PAY-a', ingredientCost: 20, costComplete: true }],
    entries: [{ id: 'PAY-a', kind: 'sale', method: 'cash', amount: 100, businessDate: '2026-10-28' }] }, '2026-10-28', '2026-10-28');
  assert.equal(report.grossSales, 0);
  assert.equal(report.collected, 100);
  assert.equal(report.cancelledCost, 20);
  assert.equal(report.estimatedProfit, -20);
});

test('CSV escapes spreadsheet formulas, quotes and multiline descriptions', () => {
  const csv = financeCsv([['=HYPERLINK("bad")', 'line\nbreak', -12.5, '@bad']]);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"-12.5"'));
  assert.ok(csv.includes("'@bad"));
  assert.ok(csv.startsWith('\uFEFF'));
});
