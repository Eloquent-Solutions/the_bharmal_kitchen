import { documentHtml, kitchenDocument } from './printDocument';
export function buildKitchenTicketHtml(kot) { return documentHtml(kitchenDocument(kot)); }
export function printKitchenTicket(kot) {
  const popup = window.open('', '_blank', 'width=420,height=680');
  if (!popup) throw new Error('Pop-up blocked. Allow pop-ups to print the kitchen ticket.');
  popup.document.write(buildKitchenTicketHtml(kot)); popup.document.close(); popup.focus(); popup.print();
}

export async function sendKitchenTicket(kot) { const { queueManualPrintCloud } = await import('../services/printingCloud'); await queueManualPrintCloud(kot, 'kot'); }
