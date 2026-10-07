import { formatCurrency } from './formatters';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function buildBillingReceiptHtml(order) {
  if (!order?.id || !Array.isArray(order.items)) throw new Error('A saved bill is required to print a receipt.');
  const lines = order.items.map((item) => {
    const qty = Number(item.qty ?? item.quantity) || 0;
    return `<tr><td>${escapeHtml(item.name)}</td><td>${qty}</td><td>${escapeHtml(formatCurrency(item.price))}</td><td>${escapeHtml(formatCurrency(qty * Number(item.price || 0)))}</td></tr>`;
  }).join('');
  const rows = [
    ['Subtotal', order.subtotal], ['Discount', order.discount ? -Number(order.discount) : null],
    ['CGST', order.cgst], ['SGST', order.sgst], ['Service charge', order.serviceCharge],
    ['Round off', order.roundOffAmount],
  ].filter(([, value]) => value != null && Number(value) !== 0)
    .map(([label, value]) => `<div class="row"><span>${label}</span><span>${escapeHtml(formatCurrency(value))}</span></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Bill ${escapeHtml(order.id)}</title>
  <style>@page{size:80mm auto;margin:4mm}body{font:12px Arial,sans-serif;color:#111;max-width:72mm;margin:0 auto}
  h1{text-align:center;font-size:17px;margin:4px 0}p{text-align:center;margin:4px 0}.row{display:flex;justify-content:space-between;margin:5px 0}
  table{width:100%;border-collapse:collapse;margin:10px 0}th,td{text-align:left;border-bottom:1px dashed #999;padding:5px 2px}td:nth-child(n+2),th:nth-child(n+2){text-align:right}
  .total{font-size:16px;font-weight:bold;border-top:1px solid #111;padding-top:8px}.status{text-align:center;font-weight:bold;margin-top:12px}</style></head><body>
  <h1>The Bharmals Kitchen</h1><p>Bill ${escapeHtml(order.id)}</p>
  <div class="row"><span>Date</span><span>${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : '')}</span></div>
  <div class="row"><span>Customer</span><span>${escapeHtml(order.customer || 'Walk-in Guest')}</span></div>
  <div class="row"><span>Type</span><span>${escapeHtml((order.orderType || '').replace('_', ' '))}${order.table ? ` · ${escapeHtml(order.table)}` : ''}</span></div>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table>
  ${rows}<div class="row total"><span>Total</span><span>${escapeHtml(formatCurrency(order.total))}</span></div>
  <div class="status">${order.paymentStatus === 'paid' ? 'PAID' : 'PAYMENT DUE'}${order.paymentMethod ? ` · ${escapeHtml(order.paymentMethod.toUpperCase())}` : ''}</div>
  <p>Thank you for visiting</p></body></html>`;
}

export function printBillingReceipt(order) {
  const popup = window.open('', '_blank', 'width=420,height=680');
  if (!popup) throw new Error('Pop-up blocked. Allow pop-ups to print this bill.');
  popup.document.write(buildBillingReceiptHtml(order));
  popup.document.close();
  popup.focus();
  popup.print();
}
