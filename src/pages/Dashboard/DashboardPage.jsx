import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useFinanceData from '../../hooks/useFinanceData';
import { DateFilters, FinanceState, FinanceTable, Metrics } from '../../components/Finance/FinanceUI';
import { buildFinanceReport, datePreset, expectedShiftCash } from '../../utils/finance';
import { formatCurrency } from '../../utils/formatters';

export default function DashboardPage() {
  const data = useFinanceData();
  const [range, setRange] = useState(() => datePreset('today'));
  const report = useMemo(() => buildFinanceReport(data, range.from, range.to), [data, range]);
  const active = data.orders.filter((order) => ['received', 'cooking', 'ready'].includes(order.status));
  const shift = data.shifts.find((entry) => entry.id === data.register?.activeShiftId);
  const unpaid = data.orders.filter((order) => order.status !== 'cancelled' && order.paymentStatus !== 'paid');
  return <div className="finance-page"><header className="finance-heading"><div><h2>Restaurant overview</h2><p>Sales, collections, costs, and takeaway operations.</p></div><Link className="btn btn-secondary" to="/finance/day-close">Review day closing</Link></header>
    <FinanceState data={data}><DateFilters range={range} setRange={setRange} />
      <Metrics items={[
        ['Billed sales', formatCurrency(report.grossSales), 'Non-cancelled bills in the selected period'],
        ['Collections', formatCurrency(report.collected), 'Payments received in the selected period'],
        ['Unpaid bills', formatCurrency(report.outstanding), 'Unpaid portion of bills in this period'],
        ['Estimated operating profit', report.estimatedProfit == null ? 'Incomplete costs' : formatCurrency(report.estimatedProfit), 'Net sales less ingredients, wastage, and recorded expenses'],
      ]} />
      {report.estimatedProfit == null && <p className="finance-note">Profit needs complete historical ingredient and tax records. {report.missingCost} bills have incomplete ingredient costs; {report.missingTax} have incomplete tax records; {report.missingWastageCost} wastage entries lack costs. <Link to="/reports/profit">Review profitability</Link>.</p>}
      <Metrics items={[
        ['Active orders now', active.length, `${active.filter((order) => order.status === 'ready').length} ready for pickup`],
        ['All unpaid balances', formatCurrency(unpaid.reduce((sum, order) => sum + Number(order.total || 0), 0)), `${unpaid.length} bills across all dates`],
        ['Expected drawer now', shift ? formatCurrency(expectedShiftCash(shift)) : 'Register closed', shift ? `Business date ${shift.businessDate}` : 'Open a shift before taking payments'],
        ['Recorded expenses', formatCurrency(report.expenseTotal), 'Selected period; supplier stock purchases are not counted twice'],
      ]} />
      <section><h3>Daily sales</h3><FinanceTable rows={report.daily} columns={[{ key: 'date', label: 'Business date' }, { key: 'bills', label: 'Bills' }, { key: 'net', label: 'Net sales', render: (row) => formatCurrency(row.net) }, { key: 'tax', label: 'Tax', render: (row) => formatCurrency(row.tax) }, { key: 'total', label: 'Bill total', render: (row) => formatCurrency(row.total) }]} /></section>
      <section><h3>Collections by payment method</h3><FinanceTable rows={Object.entries(report.byMethod).map(([method, amount]) => ({ id: method, method, amount }))} columns={[{ key: 'method', label: 'Payment method' }, { key: 'amount', label: 'Received', render: (row) => formatCurrency(row.amount) }]} /></section>
    </FinanceState>
  </div>;
}
