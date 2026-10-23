const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function buildKitchenTicketHtml(kot) {
  if (!kot?.id || !kot?.orderId) throw new Error('A saved kitchen ticket is required to print.');
  const lines = Array.isArray(kot.itemsList) && kot.itemsList.length
    ? kot.itemsList.map((item) => `<li><strong>${escapeHtml(item.qty ?? item.quantity ?? 1)} ×</strong> ${escapeHtml(item.name)}</li>`).join('')
    : `<li>${escapeHtml(kot.items || 'Items unavailable')}</li>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Kitchen ticket ${escapeHtml(kot.id)}</title>
    <style>@page{size:80mm auto;margin:4mm}body{font:14px Arial,sans-serif;color:#111;max-width:72mm;margin:0 auto}
    h1{text-align:center;font-size:19px;margin:4px 0}p{margin:6px 0}ul{padding-left:18px}li{padding:5px 0;border-bottom:1px dashed #999}
    .divider{border-top:2px solid #111;margin:10px 0}</style></head><body>
    <h1>KITCHEN ORDER</h1><p><strong>${escapeHtml(kot.id)}</strong> · Order ${escapeHtml(kot.orderId)}</p>
    <p><strong>${escapeHtml(kot.table || 'Takeaway')}</strong> · ${escapeHtml(kot.station || 'Kitchen')}</p>
    <p>${escapeHtml(kot.createdAt ? new Date(kot.createdAt).toLocaleString('en-IN') : '')}</p>
    <div class="divider"></div><ul>${lines}</ul>${kot.notes ? `<p>Note: ${escapeHtml(kot.notes)}</p>` : ''}</body></html>`;
}

export function printKitchenTicket(kot) {
  const popup = window.open('', '_blank', 'width=420,height=680');
  if (!popup) throw new Error('Pop-up blocked. Allow pop-ups to print the kitchen ticket.');
  popup.document.write(buildKitchenTicketHtml(kot));
  popup.document.close();
  popup.focus();
  popup.print();
}
