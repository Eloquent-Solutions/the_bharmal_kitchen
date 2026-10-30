// One document model drives browser receipts, previews, and ESC/POS network jobs.
const amount = (value) => `INR ${Number(value || 0).toFixed(2)}`;
// ESC/POS control bytes are stripped before they can become receipt content.
// eslint-disable-next-line no-control-regex
const clean = (value, limit = 600) => String(value ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, limit);
export const RECEIPT_DEFAULTS = { version: 2, paperWidth: '80mm', fontSize: 12, headingSize: 18, align: 'center', tagline: '', footer: 'Thank you. We look forward to serving you again.', autoCut: true };
export function normalizeReceiptTemplate(template = {}) {
  // Legacy editor content contains sample bill numbers and tax IDs. Never print them.
  return { ...RECEIPT_DEFAULTS,
    paperWidth: template.paperWidth === '58mm' ? '58mm' : '80mm',
    fontSize: Math.min(16, Math.max(10, Number(template.fontSize) || 12)),
    headingSize: Math.min(24, Math.max(14, Number(template.headingSize) || 18)),
    align: ['left', 'center', 'right'].includes(template.align) ? template.align : 'center',
    tagline: clean(template.version === 2 ? template.tagline : ''),
    footer: clean(template.version === 2 ? template.footer : RECEIPT_DEFAULTS.footer), autoCut: template.autoCut !== false };
}
export function receiptDocument(order, savedTemplate = {}) {
  if (!order?.id || !Array.isArray(order.items)) throw new Error('A saved bill is required to print.');
  const template = normalizeReceiptTemplate(savedTemplate); const business = order.receiptBusiness || {};
  const blocks = [];
  const text = (value, options = {}) => { if (value) blocks.push({ text: clean(value), ...options }); };
  text(business.name || 'The Bharmals Kitchen', { bold: true, large: true, align: template.align });
  text(template.tagline, { align: template.align });
  [business.address, business.phone, business.email, business.gstin && `GSTIN: ${business.gstin}`, business.fssai && `FSSAI: ${business.fssai}`].filter(Boolean).forEach((value) => text(value, { align: template.align }));
  text(`Bill: ${order.id}`, { bold: true });
  text(order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');
  text(`Customer: ${order.customer || 'Walk-in Guest'}`);
  if (order.phone) text(`Phone: ${order.phone}`);
  text(`${String(order.orderType || 'takeaway').replace('_', ' ')}${order.table ? ` / ${order.table}` : ''}`);
  blocks.push({ divider: true });
  order.items.forEach((item) => {
    const qty = Number(item.quantity ?? item.qty) || 0;
    text(`${qty} x ${item.name}`, { bold: true });
    text(`  ${amount(item.price)} each  ${amount(qty * Number(item.price || 0))}`);
  });
  blocks.push({ divider: true });
  [['Subtotal', order.subtotal], ['Discount', order.discount ? -order.discount : 0], ['CGST', order.cgst], ['SGST', order.sgst], ['Service charge', order.serviceCharge], ['Round off', order.roundOffAmount]].forEach(([label, value]) => { if (Number(value)) text(`${label}: ${amount(value)}`); });
  text(`TOTAL: ${amount(order.total)}`, { bold: true, large: true });
  text(`${order.paymentStatus === 'paid' ? 'PAID' : 'PAYMENT DUE'} · ${String(order.paymentMethod || '').toUpperCase()}`, { bold: true });
  text(template.footer, { align: template.align });
  return { kind: 'receipt', title: `Bill ${order.id}`, ...template, blocks };
}
export function kitchenDocument(kot, printer = {}) {
  if (!kot?.id || !kot.orderId) throw new Error('A saved kitchen ticket is required.');
  const blocks = [{ text: 'KITCHEN ORDER', bold: true, large: true, align: 'center' }, { text: clean(kot.id), bold: true }, { text: `Order: ${clean(kot.orderId)}` }, { text: `${clean(kot.table || 'Takeaway')} / ${clean(kot.station || 'Kitchen')}`, bold: true }, { divider: true }];
  for (const item of kot.itemsList || []) blocks.push({ text: clean(`${item.qty ?? item.quantity ?? 1} x ${item.name}`), bold: true });
  if (!kot.itemsList?.length) blocks.push({ text: clean(kot.items || 'Items unavailable') });
  if (kot.notes) blocks.push({ text: `NOTE: ${clean(kot.notes)}`, bold: true });
  return { kind: 'kot', title: `Kitchen ${kot.id}`, paperWidth: printer.paperWidth || '80mm', autoCut: printer.autoCut !== false, fontSize: 14, headingSize: 19, blocks };
}
export const escapePrintHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function documentHtml(document) {
  const width = document.paperWidth === '58mm' ? 58 : 80;
  const blocks = document.blocks.map((block) => block.divider ? '<hr>' : `<p style="text-align:${['left', 'center', 'right'].includes(block.align) ? block.align : 'left'};font-weight:${block.bold ? 700 : 400};font-size:${block.large ? document.headingSize : document.fontSize}px">${escapePrintHtml(block.text).replace(/\bINR /g, '₹')}</p>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapePrintHtml(document.title)}</title><style>@page{size:${width}mm auto;margin:3mm}body{color:#111;background:white;font-family:Arial,sans-serif;max-width:${width - 8}mm;margin:0 auto}p{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}hr{border:0;border-top:1px dashed #333}</style></head><body>${blocks}</body></html>`;
}
