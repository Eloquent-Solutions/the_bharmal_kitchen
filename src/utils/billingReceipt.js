import { getReceiptTemplate } from '../services/dataService';
import { documentHtml, receiptDocument } from './printDocument';
export function buildBillingReceiptHtml(order, template = typeof window === 'undefined' ? {} : getReceiptTemplate() || {}) {
  return documentHtml(receiptDocument(order, template));
}
export function printBillingReceipt(order) {
  const popup = window.open('', '_blank', 'width=420,height=680');
  if (!popup) throw new Error('Pop-up blocked. Allow pop-ups to print this bill.');
  popup.document.write(buildBillingReceiptHtml(order)); popup.document.close(); popup.focus(); popup.print();
}

export async function sendBillingReceipt(order) { const { queueManualPrintCloud } = await import('../services/printingCloud'); await queueManualPrintCloud(order, 'receipt'); }
