const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function buildDayCloseHtml(record, restaurantName = 'The Bharmals Kitchen') {
  if (!record?.businessDate || record.schemaVersion !== 2) throw new Error('Select a saved day close first.');
  const amount = (value) => `INR ${Number(value || 0).toFixed(2)}`;
  const rows = [['Billed sales', record.grossSales], ['Net sales', record.netSales], ['CGST', record.cgst], ['SGST', record.sgst], ['Collections', record.collected], ['Cash collected', record.paymentMix?.cash], ['UPI collected', record.paymentMix?.upi], ['Operating expenses', record.expenses], ['Unpaid bills at close', record.outstanding], ['Shift cash difference', record.variance]];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Day close ${escape(record.businessDate)}</title><style>body{font:14px Arial,sans-serif;color:#111;max-width:750px;margin:30px auto}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:9px;border-bottom:1px solid #ddd}td:last-child{text-align:right}small{display:block;margin:16px 0}</style></head><body><h1>${escape(record.restaurantName || restaurantName)}</h1><h2>Saved day close · ${escape(record.businessDate)}</h2><p>Closed by ${escape(record.createdBy)} · ${escape(record.closedAt)}</p><table>${rows.map(([label, value]) => `<tr><td>${escape(label)}</td><td>${amount(value)}</td></tr>`).join('')}</table><small>${record.missingTax ? `${record.missingTax} bills lack complete tax details. ` : ''}${record.legacyPayments ? `${record.legacyPayments} older receipts are outside the register ledger. ` : ''}This is an operating summary of recorded transactions.</small><h3>Register counts</h3><table><tr><th>Shift</th><th>Expected</th><th>Counted</th><th>Difference</th></tr>${record.shifts.map((shift) => `<tr><td>${escape(shift.shiftName)}</td><td>${amount(shift.expectedCash)}</td><td>${amount(shift.actualCash)}</td><td>${amount(shift.variance)}</td></tr>`).join('')}</table></body></html>`;
}

export function printDayClose(record, restaurantName) {
  const html = buildDayCloseHtml(record, restaurantName);
  const popup = window.open('', '_blank', 'width=850,height=700');
  if (!popup) throw new Error('Allow pop-ups to print the saved day close.');
  popup.document.write(html); popup.document.close(); popup.focus(); popup.print();
}
