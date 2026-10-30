import { doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { auditWrite } from './settingsCloud';
import { normalizeReceiptTemplate, kitchenDocument, receiptDocument } from '../utils/printDocument';
import { validatePrinting } from '../utils/printRouting';

export async function savePrintingCloud(input, database = db, actor = auth?.currentUser) {
  const config = validatePrinting(input);
  if (!database) throw new Error('Database unavailable.');
  await runTransaction(database, async (transaction) => {
    transaction.set(doc(database, 'settings', 'printing'), { ...config, updatedAt: serverTimestamp() });
    auditWrite(transaction, database, actor, 'Updated printer routing', 'settings/printing');
  });
}
export async function saveReceiptTemplateCloud(input, database = db, actor = auth?.currentUser) {
  const template = normalizeReceiptTemplate(input);
  await runTransaction(database, async (transaction) => {
    transaction.set(doc(database, 'settings', 'receipt_template'), { ...template, updatedAt: serverTimestamp() });
    auditWrite(transaction, database, actor, 'Updated receipt design', 'settings/receipt_template');
  });
}
export async function claimPrintJob(id, deviceId, database = db, actor = auth?.currentUser) {
  if (!actor?.uid) throw new Error('Staff sign-in required.');
  const ref = doc(database, 'print_queue', id);
  return runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return null;
    const job = snapshot.data();
    if (job.status === 'sending' && (job.leaseUntil?.toMillis?.() ?? Number(job.leaseUntil)) < Date.now()) {
      transaction.update(ref, { status: 'unknown', error: 'Print station stopped during delivery. Check the printer before reprinting.', updatedAt: serverTimestamp() }); return null;
    }
    if (job.status !== 'pending') return null;
    const claim = { status: 'sending', deviceId, claimedById: actor.uid, leaseUntil: Timestamp.fromMillis(Date.now() + 45000), updatedAt: serverTimestamp() };
    transaction.update(ref, claim); return { ...job, ...claim, id };
  }).catch(async (error) => {
    // A competing claim can be rejected by transition rules before Firestore
    // reports an aborted transaction. Only an authoritative claimed/finished
    // state makes this a benign race; real permission failures still surface.
    if (error.code === 'permission-denied') {
      const latest = await getDocFromServer(ref);
      if (latest.exists() && latest.data().status !== 'pending') return null;
    }
    throw error;
  });
}
export async function finishPrintJob(id, deviceId, result, database = db) {
  const ref = doc(database, 'print_queue', id);
  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().status !== 'sending' || snapshot.data().deviceId !== deviceId) return;
    transaction.update(ref, { status: ['sent', 'failed', 'unknown'].includes(result.status) ? result.status : 'unknown', error: String(result.error || '').slice(0, 400), sentTo: result.printerId || '', updatedAt: serverTimestamp() });
  });
}
export async function reprintJob(job, confirmUncertain, database = db, actor = auth?.currentUser) {
  if (!['failed', 'unknown', 'sent'].includes(job.status)) throw new Error('This job is still waiting or sending.');
  if (job.status !== 'failed' && !confirmUncertain) throw new Error('Check the printer before requesting another copy.');
  const id = `REPRINT-${crypto.randomUUID()}`;
  await runTransaction(database, async (transaction) => {
    const original = await transaction.get(doc(database, 'print_queue', job.id));
    if (!original.exists() || !['failed', 'unknown', 'sent'].includes(original.data().status)) throw new Error('This job changed. Reload the queue before reprinting.');
    if (original.data().status !== 'failed' && !confirmUncertain) throw new Error('Check the printer before requesting another copy.');
    job = { ...original.data(), id: original.id };
    transaction.set(doc(database, 'print_queue', id), { id, orderId: job.orderId, kind: job.kind, printer: job.printer, backup: job.backup || null, document: job.document, copy: 1, status: 'pending', originalJobId: job.id, createdById: actor?.uid, createdAt: new Date().toISOString() });
    auditWrite(transaction, database, actor, 'Requested print copy', `print_queue/${job.id}`);
  });
}

export async function queueManualPrintCloud(record, kind, database = db, actor = auth?.currentUser) {
  const requestId = `MANUAL-${crypto.randomUUID()}`;
  return runTransaction(database, async (transaction) => {
    const config = (await transaction.get(doc(database, 'settings', 'printing'))).data();
    const template = (await transaction.get(doc(database, 'settings', 'receipt_template'))).data() || {};
    if (!config?.enabled) throw new Error('Network printing is disabled. Use browser printing instead.');
    const source = await transaction.get(doc(database, kind === 'receipt' ? 'orders' : 'kots', record.id));
    if (!source.exists()) throw new Error('Saved document is no longer available.');
    const data = { ...source.data(), id: source.id };
    const settings = validatePrinting(config);
    const routes = kind === 'receipt' ? [settings.routes.find((r) => r.kind === 'receipt')] : [...new Set((data.itemsList || []).map((item) => item.station || 'Kitchen'))].map((station) => ({ station, route: settings.routes.find((r) => r.kind === 'kot' && r.station === station) || settings.routes.find((r) => r.kind === 'kot' && r.station === '*') }));
    if (!routes.length) throw new Error('Ticket has no items.');
    routes.forEach((entry, index) => {
      const route = kind === 'receipt' ? entry : entry.route;
      if (!route) throw new Error('Configure a matching printer route first.');
      const printer = settings.printers.find((p) => p.id === route.printerId);
      const backup = settings.printers.find((p) => p.id === route.backupId) || null;
      const document = kind === 'receipt' ? receiptDocument(data, template) : kitchenDocument({ ...data, station: entry.station, itemsList: data.itemsList.filter((item) => (item.station || 'Kitchen') === entry.station) }, printer);
      for (let copy = 1; copy <= route.copies; copy++) {
        const id = `${requestId}-${index}-${copy}`;
        transaction.set(doc(database, 'print_queue', id), { id, kind, orderId: data.orderId || data.id, printer, backup, document: { ...document, paperWidth: printer.paperWidth, autoCut: document.autoCut !== false && printer.autoCut }, status: 'pending', copy, createdAt: new Date().toISOString(), createdById: actor?.uid });
      }
    });
    auditWrite(transaction, database, actor, 'Queued manual print', `${kind}/${record.id}`);
  });
}
