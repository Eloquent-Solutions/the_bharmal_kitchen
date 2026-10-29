import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFinanceData from '../../hooks/useFinanceData';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../firebase/config';
import { PERMISSIONS } from '../../constants/roles';
import { buildFinanceReport, datePreset, orderBusinessDate } from '../../utils/finance';
import { formatCurrency, formatRecordId } from '../../utils/formatters';
import { FinanceState, Metrics, DateFilters, FinanceTable, CsvButton } from '../../components/Finance/FinanceUI';

const descriptions = {
  sales: ['Sales & collections', 'Bills follow their business date. Collections follow the date payment was received.'],
  orders: ['Order report', 'Review billed orders, kitchen status, payment status, and unpaid pickup balances.'],
  profit: ['Estimated operating profit', 'Recorded sales less saved recipe costs, wastage, and operating expenses.'],
  tax: ['Recorded sales tax', 'The CGST and SGST amounts saved on each bill, with no assumed tax rate.'],
  cost: ['Food cost report', 'Ingredient costs saved when a bill was created, grouped by dish.'],
};
const taxValue = (value) => value == null ? 'Missing' : formatCurrency(value);

export default function FinanceReportPage({ type }) {
  const data = useFinanceData();
  const { hasPermission } = useAuth();
  const [range, setRange] = useState(() => datePreset('month'));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const report = buildFinanceReport(data, range.from, range.to);
  const filteredOrders = report.allOrders.filter((order) => `${order.id} ${order.customer || ''} ${(order.items || []).map((item) => item.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())
    && (status === 'all' || (status === 'unpaid' ? order.paymentStatus !== 'paid' && order.status !== 'cancelled' : order.status === status)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const dishes = report.dishes.filter((dish) => String(dish.name).toLowerCase().includes(search.toLowerCase()));
  const categories = Object.entries(report.expenses.reduce((result, expense) => ({ ...result, [expense.category]: (result[expense.category] || 0) + Number(expense.amount) }), {}))
    .map(([name, amount]) => ({ name, amount }));
  let metrics;
  if (type === 'tax') metrics = [['Recorded taxable sales', formatCurrency(report.netSales)], ['CGST', formatCurrency(report.cgst)], ['SGST', formatCurrency(report.sgst)], ['Bills missing tax details', report.missingTax]];
  else if (type === 'profit') metrics = [['Operating revenue', formatCurrency(report.operatingRevenue)], ['Saved ingredient costs', formatCurrency(report.ingredientCost)], ['Wastage + overhead', formatCurrency(report.wastageCost + report.expenseTotal)], ['Estimated profit', report.estimatedProfit == null ? 'Incomplete' : formatCurrency(report.estimatedProfit)]];
  else if (type === 'cost') metrics = [['Dishes sold', report.dishes.length], ['Saved ingredient costs', formatCurrency(report.ingredientCost - report.cancelledCost)], ['Bills missing cost snapshots', report.missingCost], ['Cancelled stock cost', formatCurrency(report.cancelledCost)]];
  else metrics = [['Billed sales', formatCurrency(report.grossSales), 'Excludes cancelled bills'], ['Collected', formatCurrency(report.collected), 'Includes payments for older bills'], ['Unpaid on bills in period', formatCurrency(report.outstanding)], ['Bills / cancelled', `${report.orders.length} / ${report.allOrders.length - report.orders.length}`]];
  const orderCsv = [['Bill', 'Business date', 'Customer', 'Status', 'Payment status', 'Method', 'Taxable', 'CGST', 'SGST', 'Total'],
    ...filteredOrders.map((row) => [row.id, orderBusinessDate(row), row.customer, row.status, row.paymentStatus, row.paymentMethod, row.taxableAmount, row.cgst, row.sgst, row.total])];
  const exportRows = type === 'cost' ? [['Dish', 'Qty', 'Line sales before discount/tax', 'Known ingredient cost', 'Uncosted qty'], ...dishes.map((row) => [row.name, row.qty, row.sales, row.cost, row.uncostedQty])]
    : type === 'profit' ? [['From', 'To', 'Operating revenue', 'Known ingredient cost', 'Wastage', 'Expenses', 'Estimated profit', 'Missing cost bills', 'Missing tax bills'], [range.from, range.to, report.operatingRevenue, report.ingredientCost, report.wastageCost, report.expenseTotal, report.estimatedProfit ?? '', report.missingCost, report.missingTax]]
      : type === 'sales' ? [['Business date', 'Bills', 'Billed total', 'Recorded taxable sales', 'Recorded tax'], ...report.daily.map((row) => [row.date, row.bills, row.total, row.net, row.tax])]
        : type === 'tax' ? [orderCsv[0], ...orderCsv.slice(1).filter((row) => row[3] !== 'cancelled')] : orderCsv;

  return <FinanceState data={data}><div className="finance-page">
    <div className="finance-heading"><div><h2>{descriptions[type][0]}</h2><p>{descriptions[type][1]}</p></div></div>
    {isDemoMode && <p className="finance-note">Finance preview. Reports use Firebase records when connected to your development project.</p>}
    <DateFilters range={range} setRange={setRange}><CsvButton name={`${type}-${range.from}-${range.to}.csv`} rows={exportRows} disabled={!hasPermission(PERMISSIONS.EXPORT_REPORTS)} /></DateFilters>
    <Metrics items={metrics} />
    {report.missingTax > 0 && ['sales', 'tax', 'profit'].includes(type) && <p className="finance-note">{report.missingTax} older bills lack complete saved tax details. Known tax amounts are shown; a current rate is never applied to old bills.</p>}
    {['cost', 'profit'].includes(type) && <p className="finance-note">{report.missingCost ? `${report.missingCost} bills lack complete ingredient costs. Profit is incomplete until those gaps are resolved. ` : ''}Recipe costs are estimates and can omit unrecorded usage. Ingredient purchases are inventory, so purchase bill totals are not subtracted again as expenses. Cancelled bills retain their deducted ingredient cost. {type === 'profit' && <Link to="/reports/food-cost">Review dish costs</Link>}</p>}
    {type === 'profit' && report.missingWastageCost > 0 && <p className="finance-note">{report.missingWastageCost} wastage entries lack a recorded loss value. Estimated profit is incomplete.</p>}
    {type === 'sales' && <>
      <h3>Sales by business day</h3><FinanceTable rows={report.daily} columns={[{ key: 'date', label: 'Date' }, { key: 'bills', label: 'Bills' }, { key: 'net', label: 'Recorded taxable sales', render: (row) => formatCurrency(row.net) }, { key: 'tax', label: 'Recorded tax', render: (row) => formatCurrency(row.tax) }, { key: 'total', label: 'Billed total', render: (row) => formatCurrency(row.total) }]} />
      <h3>Payments received in period</h3><FinanceTable rows={Object.entries(report.byMethod).map(([method, amount]) => ({ method, amount }))} columns={[{ key: 'method', label: 'Method' }, { key: 'amount', label: 'Collected', render: (row) => formatCurrency(row.amount) }]} />
      {report.payments.some((payment) => payment.legacy) && <p className="finance-note">Older paid bills without a register entry are included in collections by their saved payment date, or bill date when payment date is missing. They are not assigned to a new shift.</p>}
    </>}
    {type === 'orders' && <>
      <div className="finance-actions"><input className="input" aria-label="Search order report" placeholder="Search bill, customer, or dish" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="input" aria-label="Order status" value={status} onChange={(event) => setStatus(event.target.value)}>{['all', 'unpaid', 'received', 'cooking', 'ready', 'completed', 'cancelled'].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <FinanceTable rows={filteredOrders} columns={[{ key: 'id', label: 'Bill', render: (row) => <span title={row.id}>{formatRecordId(row.id)}</span> }, { key: 'businessDate', label: 'Business date', render: orderBusinessDate }, { key: 'customer', label: 'Customer' }, { key: 'orderType', label: 'Channel' }, { key: 'status', label: 'Kitchen status' }, { key: 'paymentStatus', label: 'Payment' }, { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) }]} />
    </>}
    {type === 'tax' && <><p className="finance-note">This is a summary of recorded bill tax for review with your accountant. It does not determine tax rates, eligibility for input credits, or generate a statutory return.</p>
      <FinanceTable rows={report.orders} columns={[{ key: 'id', label: 'Bill', render: (row) => <span title={row.id}>{formatRecordId(row.id)}</span> }, { key: 'date', label: 'Date', render: orderBusinessDate }, { key: 'taxableAmount', label: 'Taxable sales', render: (row) => taxValue(row.taxableAmount) }, { key: 'cgst', label: 'CGST', render: (row) => taxValue(row.cgst) }, { key: 'sgst', label: 'SGST', render: (row) => taxValue(row.sgst) }, { key: 'total', label: 'Bill total', render: (row) => formatCurrency(row.total) }]} />
    </>}
    {type === 'cost' && <><input className="input" aria-label="Search dish costs" placeholder="Search dishes" value={search} onChange={(event) => setSearch(event.target.value)} />
      <FinanceTable rows={dishes} columns={[{ key: 'name', label: 'Dish' }, { key: 'qty', label: 'Sold qty' }, { key: 'sales', label: 'Line sales before discount/tax', render: (row) => formatCurrency(row.sales) }, { key: 'cost', label: 'Known ingredient cost', render: (row) => formatCurrency(row.cost) }, { key: 'coverage', label: 'Cost coverage', render: (row) => row.uncostedQty ? `${row.uncostedQty} portions missing cost` : 'Complete' }, { key: 'percent', label: 'Ingredient cost %', render: (row) => !row.uncostedQty && row.sales > 0 ? `${(row.cost / row.sales * 100).toFixed(1)}%` : 'Incomplete' }]} />
    </>}
    {type === 'profit' && <><h3>Operating expenses by category</h3><FinanceTable rows={categories} columns={[{ key: 'name', label: 'Category' }, { key: 'amount', label: 'Recorded expense', render: (row) => formatCurrency(row.amount) }]} /><p className="finance-muted">Estimated profit excludes unrecorded costs, depreciation, finance charges, and adjustments. Pending pickup bills contribute to billed sales; use collections for available cash.</p></>}
  </div></FinanceState>;
}
