import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createBridge, sendTcp } from '../print-bridge/server.mjs';
import { encodeEscPos } from '../print-bridge/escpos.mjs';
import { receiptDocument, documentHtml } from '../src/utils/printDocument.js';
// Vite resolves browser extensionless imports for routing in cloud integration tests.
import { draftForDish, draftCost } from '../src/utils/recipeDrafts.js';

const doc = { paperWidth: '80mm', autoCut: true, blocks: [{ text: 'KITCHEN', bold: true }, { text: '1 x Chicken', large: true }] };
const token = 'a'.repeat(64);
async function listen(server) { await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve)); return server.address().port; }
async function close(server) { await new Promise((resolve) => server.close(resolve)); }

test('thermal encoder strips control commands and wraps narrow paper', () => {
  const bytes = encodeEscPos({ ...doc, paperWidth: '58mm', blocks: [{ text: `Chicken\x1b\x70\x00${'a'.repeat(60)}` }] });
  assert.equal(bytes.includes(Buffer.from([27, 112, 0])), false);
  assert.ok(bytes.includes(Buffer.from([29, 86, 66, 0])));
  assert.ok(bytes.toString().includes('\n'));
});
test('real TCP simulator receives encoded ticket bytes', async () => {
  const received = [];
  const server = net.createServer((socket) => socket.on('data', (bytes) => received.push(bytes)));
  const port = await listen(server);
  try {
    assert.equal((await sendTcp({ ipAddress: '127.0.0.1', port }, encodeEscPos(doc))).status, 'sent');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.match(Buffer.concat(received).toString(), /1 x Chicken/);
  } finally { await close(server); }
});
test('bridge rejects foreign origins, wrong token, unknown targets; serializes and persists job deduplication', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'tbk-bridge-')); let calls = 0;
  const config = { token, origins: ['https://kitchen.example'], targets: [{ ipAddress: '192.168.1.50', port: 9100 }] };
  const options = { statePath: path.join(folder, 'journal.json'), deliver: async () => { calls++; return { status: 'sent' }; } };
  let server = await createBridge(config, options); let port = await listen(server);
  const headers = { Origin: config.origins[0], Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const job = { id: 'job-1', printer: { id: 'p1', ...config.targets[0] }, document: doc };
  const post = (body = job, otherHeaders = {}) => fetch(`http://127.0.0.1:${port}/jobs`, { method: 'POST', headers: { ...headers, ...otherHeaders }, body: JSON.stringify(body) });
  try {
    assert.equal((await post(job, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post(job, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await post({ ...job, printer: { ipAddress: '8.8.8.8', port: 9100 } })).status, 400);
    const replies = await Promise.all([post(), post()]);
    assert.equal((await replies[0].json()).status, 'sent'); assert.equal((await replies[1].json()).duplicate, true); assert.equal(calls, 1);
    await close(server); server = await createBridge(config, options); port = await listen(server);
    assert.equal((await (await post()).json()).duplicate, true); assert.equal(calls, 1);
    assert.equal((await post({ ...job, document: { ...doc, autoCut: false } })).status, 400);
  } finally { await close(server); await rm(folder, { recursive: true, force: true }); }
});
test('backup is attempted only before any data delivery; uncertain result is never resent', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'tbk-bridge-fail-')); const sent = [];
  const primary = { id: 'p1', ipAddress: '192.168.1.50', port: 9100 }; const backup = { id: 'p2', ipAddress: '192.168.1.51', port: 9100 };
  const server = await createBridge({ token, origins: ['http://example.test'], targets: [primary, backup] }, { statePath: path.join(folder, 'journal.json'), deliver: async (printer) => { sent.push(printer.id); return { status: printer.id === 'p1' ? 'unknown' : 'sent' }; } });
  const port = await listen(server);
  const request = () => fetch(`http://127.0.0.1:${port}/jobs`, { method: 'POST', headers: { Origin: 'http://example.test', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'uncertain', printer: primary, backup, document: doc }) });
  try { assert.equal((await (await request()).json()).status, 'unknown'); await request(); assert.deepEqual(sent, ['p1']); }
  finally { await close(server); await rm(folder, { recursive: true, force: true }); }
});
test('receipt design uses saved business data, escaped text, mandatory totals; legacy samples never leak', () => {
  const order = { id: 'BILL-1', receiptBusiness: { name: '<script>alert(1)</script>', address: 'Rajkot' }, items: [{ name: 'Dish', qty: 1, price: 100 }], total: 100 };
  const html = documentHtml(receiptDocument(order, { version: 2, footer: 'Collect at counter', paperWidth: '58mm' }));
  assert.match(html, /58mm/); assert.match(html, /Collect at counter/); assert.match(html, /TOTAL: ₹100.00/); assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(documentHtml(receiptDocument(order, { sections: [{ content: 'GSTIN FAKE123' }] })), /FAKE123/);
});
test('recipe drafts keep corn flour and maida separate, refuse ambiguous stock mapping and report missing prices', () => {
  const dish = { id: 'chicken', name: 'Chicken Black Pepper', price: 149, type: 'non-veg' };
  const draft = draftForDish(dish, [{ id: 'maida', name: 'Maido', unit: 'kg', unitCost: 50 }, { id: 'corn', name: 'Corn Flour', unit: 'kg', unitCost: 50 }]);
  assert.equal(draft.ingredients.find((i) => i.id === 'maida').qty, 0.015); assert.equal(draft.ingredients.find((i) => i.id === 'corn').qty, 0.025);
  assert.ok(draft.ingredients.some((item) => item.proposedName === 'Black Pepper')); assert.equal(draft.ingredients.some((item) => item.proposedName === 'White Pepper'), false);
  assert.ok(draftCost(draft, []).missing > 0); assert.equal(draft.status, 'draft');
  assert.equal(draftForDish({ id: 'x', name: 'Mystery platter' }, []), null);
});

test('backup receives the job when the primary connection fails before sending', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'tbk-bridge-backup-')); const sent = [];
  const primary = { id: 'primary', ipAddress: '192.168.1.60', port: 9100 }; const backup = { id: 'backup', ipAddress: '192.168.1.61', port: 9100 };
  const server = await createBridge({ token, origins: ['http://example.test'], targets: [primary, backup] }, { statePath: path.join(folder, 'journal.json'), deliver: async (printer) => { sent.push(printer.id); return { status: printer.id === 'primary' ? 'failed' : 'sent' }; } });
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs`, { method: 'POST', headers: { Origin: 'http://example.test', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'backup-job', printer: primary, backup, document: doc }) });
    const result = await response.json(); assert.equal(result.status, 'sent'); assert.equal(result.printerId, 'backup'); assert.deepEqual(sent, ['primary', 'backup']);
  } finally { await close(server); await rm(folder, { recursive: true, force: true }); }
});
