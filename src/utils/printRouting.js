import { receiptDocument, kitchenDocument } from './printDocument';
export const PRINTING_DEFAULTS = { enabled: false, printers: [], routes: [] };
export function isPrivateIp(ip) {
  const parts = String(ip).split('.').map(Number);
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(String(ip)) && parts.join('.') === ip && parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && (parts[0] === 10 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}
export function validatePrinting(input) {
  if (!Array.isArray(input.printers) || input.printers.length > 12 || !Array.isArray(input.routes) || input.routes.length > 60) throw new Error('Invalid printer configuration.');
  const printers = input.printers.map((printer) => {
    if (!/^[\w-]{1,80}$/.test(printer.id) || !printer.name?.trim() || !isPrivateIp(printer.ipAddress)) throw new Error('Each printer needs a name and a private network IPv4 address.');
    const port = Number(printer.port || 9100);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid printer port.');
    return { id: printer.id, name: printer.name.trim().slice(0, 80), model: String(printer.model || '').slice(0, 80), ipAddress: printer.ipAddress, port, paperWidth: printer.paperWidth === '58mm' ? '58mm' : '80mm', autoCut: printer.autoCut !== false };
  });
  if (new Set(printers.map((p) => p.id)).size !== printers.length) throw new Error('Duplicate printer ID.');
  const ids = new Set(printers.map((p) => p.id));
  const routes = input.routes.map((route) => {
    if (!['receipt', 'kot'].includes(route.kind) || !ids.has(route.printerId) || (route.backupId && !ids.has(route.backupId))) throw new Error('Choose a configured printer for each route.');
    if (!Number.isInteger(Number(route.copies)) || Number(route.copies) < 1 || Number(route.copies) > 3) throw new Error('Copies must be 1–3.');
    return { kind: route.kind, station: String(route.station || '*').trim().slice(0, 100), printerId: route.printerId, backupId: route.backupId || '', copies: Number(route.copies) };
  });
  const keys = routes.map((route) => `${route.kind}:${route.kind === 'receipt' ? '*' : route.station}`);
  if (new Set(keys).size !== keys.length) throw new Error('Use one receipt route and one route per kitchen station.');
  return { enabled: input.enabled === true, printers, routes };
}
export function planPrintJobs(order, kot, settings = PRINTING_DEFAULTS, pos = {}, template = {}) {
  if (!settings.enabled) return [];
  const config = validatePrinting({ ...PRINTING_DEFAULTS, ...settings }); const jobs = [];
  const add = (route, document, suffix) => {
    const printer = config.printers.find((p) => p.id === route.printerId);
    const backup = config.printers.find((p) => p.id === route.backupId);
    for (let copy = 1; copy <= route.copies; copy++) jobs.push({ id: `AUTO-${order.id}-${suffix}-${copy}`, orderId: order.id, kind: route.kind, printer, backup: backup || null, document: { ...document, paperWidth: printer.paperWidth, autoCut: document.autoCut !== false && printer.autoCut }, copy, status: 'pending', createdAt: order.createdAt, createdById: order.createdById || null });
  };
  if (pos.autoPrintReceipt) {
    const route = config.routes.find((r) => r.kind === 'receipt');
    if (!route) throw new Error('Set a receipt printer route, or turn off automatic receipts in POS settings.');
    add(route, receiptDocument(order, template), 'receipt');
  }
  if (pos.autoPrintKOTOnOrder) {
    const stations = [...new Set(order.items.map((item) => item.station || 'Kitchen'))];
    stations.forEach((station, index) => {
      const route = config.routes.find((r) => r.kind === 'kot' && r.station === station) || config.routes.find((r) => r.kind === 'kot' && r.station === '*');
      if (!route) throw new Error(`Set a kitchen printer route for ${station}, or turn off automatic KOT printing.`);
      add(route, kitchenDocument({ ...kot, station, itemsList: order.items.filter((item) => (item.station || 'Kitchen') === station) }), `kot-${index}`);
    });
  }
  return jobs;
}
