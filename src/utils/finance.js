export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';
export const money = (value) => Number(Number(value || 0).toFixed(2));

export function businessDate(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function validBusinessDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function datePreset(preset) {
  const to = businessDate();
  if (preset === 'month') return { from: `${to.slice(0, 7)}-01`, to };
  if (preset === 'week') {
    const start = new Date(`${to}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 6);
    return { from: start.toISOString().slice(0, 10), to };
  }
  if (preset === 'all') return { from: '2000-01-01', to };
  return { from: to, to };
}

export function expectedShiftCash(shift = {}) {
  return money(Number(shift.openingCash || 0) + Number(shift.cashSales || 0)
    + Number(shift.cashIn || 0) - Number(shift.cashOut || 0)
    - Number(shift.cashExpenses || 0) - Number(shift.supplierCash || 0));
}

const numberOrNull = (value) => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export const inDateRange = (value, from, to) => Boolean(value && value >= from && value <= to);
export const orderBusinessDate = (order) => order.businessDate || businessDate(order.createdAt || order.date);
export function formatBusinessTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short',
  }).format(date) : '—';
}

// Revenue follows bill date; collections follow payment date. Pending payments
// are never treated as cash, and historical tax/cost is never reconstructed at today's rates.
export function buildFinanceReport(data, from, to) {
  const allOrders = (data.orders || []).filter((order) => inDateRange(orderBusinessDate(order), from, to));
  const orders = allOrders.filter((order) => order.status !== 'cancelled');
  const expenses = (data.expenses || []).filter((expense) => expense.status !== 'void'
    && inDateRange(expense.businessDate || businessDate(expense.date || expense.createdAt), from, to));
  const entries = (data.entries || []).filter((entry) => inDateRange(entry.businessDate, from, to));
  const payments = entries.filter((entry) => entry.kind === 'sale');
  for (const order of data.orders || []) {
    if (order.paymentStatus === 'paid' && !order.paymentEntryId
      && inDateRange(order.paymentBusinessDate || businessDate(order.paidAt || order.createdAt || order.date), from, to)) {
      payments.push({ id: `legacy-${order.id}`, referenceId: order.id, kind: 'sale',
        method: order.paymentMethod || 'unknown', amount: Number(order.total || 0), legacy: true,
        businessDate: order.paymentBusinessDate || businessDate(order.paidAt || order.createdAt || order.date) });
    }
  }
  const sum = (list, field) => money(list.reduce((total, row) => total + Number(row[field] || 0), 0));
  const missingTax = orders.filter((order) => ['taxableAmount', 'cgst', 'sgst'].some((key) => numberOrNull(order[key]) === null)).length;
  const costOrders = allOrders.filter((order) => order.costComplete === true && numberOrNull(order.ingredientCost) !== null);
  const missingCost = allOrders.length - costOrders.length;
  const ingredientCost = sum(costOrders, 'ingredientCost');
  const wastage = (data.wastage || []).filter((row) => inDateRange(row.businessDate || businessDate(row.date || row.createdAt), from, to));
  const wastageCost = sum(wastage, 'cost');
  const missingWastageCost = wastage.filter((row) => numberOrNull(row.cost) === null || Number(row.cost) <= 0).length;
  const netSales = sum(orders, 'taxableAmount');
  const expenseTotal = sum(expenses, 'amount');
  const operatingRevenue = money(netSales + sum(orders, 'serviceCharge') + sum(orders, 'roundOffAmount'));
  const byMethod = {};
  payments.forEach((entry) => { byMethod[entry.method] = money((byMethod[entry.method] || 0) + Number(entry.amount)); });
  const daily = new Map();
  orders.forEach((order) => {
    const date = orderBusinessDate(order);
    const row = daily.get(date) || { date, bills: 0, total: 0, net: 0, tax: 0 };
    row.bills += 1; row.total = money(row.total + Number(order.total || 0));
    row.net = money(row.net + Number(order.taxableAmount || 0));
    row.tax = money(row.tax + Number(order.cgst || 0) + Number(order.sgst || 0));
    daily.set(date, row);
  });
  const dishes = new Map();
  orders.forEach((order) => (order.items || []).forEach((item) => {
    const row = dishes.get(item.id || item.name) || { name: item.name, qty: 0, sales: 0, cost: 0, uncostedQty: 0 };
    const qty = Number(item.qty ?? item.quantity ?? 0);
    row.qty += qty; row.sales = money(row.sales + qty * Number(item.price || 0));
    if (item.costComplete === true && numberOrNull(item.ingredientCost) !== null) row.cost = money(row.cost + Number(item.ingredientCost));
    else row.uncostedQty += qty;
    dishes.set(item.id || item.name, row);
  }));
  return {
    orders, allOrders, expenses, entries, payments, byMethod, missingTax, missingCost, missingWastageCost,
    grossSales: sum(orders, 'total'), netSales, cgst: sum(orders, 'cgst'), sgst: sum(orders, 'sgst'),
    collected: sum(payments, 'amount'), outstanding: sum(orders.filter((order) => order.paymentStatus !== 'paid'), 'total'),
    ingredientCost, wastageCost, expenseTotal, operatingRevenue,
    estimatedProfit: missingTax || missingCost || missingWastageCost ? null : money(operatingRevenue - ingredientCost - wastageCost - expenseTotal),
    cancelledCost: sum(costOrders.filter((order) => order.status === 'cancelled'), 'ingredientCost'),
    daily: [...daily.values()].sort((a, b) => b.date.localeCompare(a.date)),
    dishes: [...dishes.values()].sort((a, b) => b.sales - a.sales),
  };
}

export function financeCsv(rows) {
  return '\uFEFF' + rows.map((row) => row.map((value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) && typeof value !== 'number') text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}

export function downloadFinanceCsv(filename, rows) {
  const url = URL.createObjectURL(new Blob([financeCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
