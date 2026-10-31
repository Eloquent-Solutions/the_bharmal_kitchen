import http from 'node:http';
import net from 'node:net';
import { timingSafeEqual, createHash } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { encodeEscPos } from './escpos.mjs';

export async function sendTcp(printer, bytes, timeout = 5000) {
  return new Promise((resolve) => {
    let started = false; let finished = false;
    const socket = net.createConnection({ host: printer.ipAddress, port: printer.port });
    const done = (status, error = '') => { if (finished) return; finished = true; socket.destroy(); resolve({ status, error }); };
    socket.setTimeout(timeout, () => done(started ? 'unknown' : 'failed', 'Printer connection timed out.'));
    socket.on('error', (error) => done(started ? 'unknown' : 'failed', error.message));
    socket.on('close', () => { if (!finished) done(started ? 'unknown' : 'failed', 'Printer closed the connection.'); });
    socket.on('connect', () => { started = true; socket.end(bytes, () => done('sent')); });
  });
}
export async function createBridge(config, { statePath, deliver = sendTcp } = {}) {
  if (!config.token || config.token.length < 32 || !Array.isArray(config.origins) || !Array.isArray(config.targets)) throw new Error('Configure a pairing token, allowed origins, and printer targets.');
  if (!statePath) throw new Error('A persistent job journal is required.');
  await mkdir(path.dirname(statePath), { recursive: true });
  let journal = {};
  try { journal = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const persist = async () => { await writeFile(`${statePath}.tmp`, JSON.stringify(journal), { mode: 0o600 }); await rename(`${statePath}.tmp`, statePath); };
  let serial = Promise.resolve();
  const allowed = (printer) => config.targets.some((target) => target.ipAddress === printer?.ipAddress && Number(target.port || 9100) === Number(printer.port));
  const perform = async (job) => {
    if (!/^[\w-]{1,320}$/.test(job.id || '') || !allowed(job.printer) || (job.backup && !allowed(job.backup))) throw new Error('Job or printer is not allowed in this bridge configuration.');
    const bytes = encodeEscPos(job.document);
    const hash = createHash('sha256').update(JSON.stringify({ printer: job.printer, backup: job.backup, document: job.document })).digest('hex');
    if (journal[job.id]) {
      if (journal[job.id].hash !== hash) throw new Error('This job ID was previously used for different content.');
      return { ...journal[job.id], duplicate: true };
    }
    // Persist before sending: a crash or lost HTTP reply must never silently reprint.
    journal[job.id] = { hash, status: 'unknown', error: 'Delivery interrupted. Check the printer before reprinting.', at: new Date().toISOString() }; await persist();
    let result = await deliver(job.printer, bytes);
    let printerId = job.printer.id;
    if (result.status === 'failed' && job.backup) { result = await deliver(job.backup, bytes); printerId = job.backup.id; }
    if (result.status === 'failed') { delete journal[job.id]; await persist(); return result; }
    journal[job.id] = { hash, ...result, printerId, at: new Date().toISOString() }; await persist();
    return journal[job.id];
  };
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (!config.origins.includes(origin) || !['127.0.0.1', 'localhost'].includes(String(req.headers.host).split(':')[0])) { res.writeHead(403); return res.end(); }
    res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.headers['access-control-request-private-network'] === 'true') res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const supplied = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, '')); const token = Buffer.from(config.token);
    if (supplied.length !== token.length || !timingSafeEqual(supplied, token)) { res.writeHead(401); return res.end(); }
    const reply = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { ok: true, protocol: 1, targets: config.targets.length });
    if (req.method !== 'POST' || req.url !== '/jobs' || !String(req.headers['content-type']).startsWith('application/json')) return reply(404, { error: 'Unsupported request.' });
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 200000) throw new Error('Job is too large.'); }
      const job = JSON.parse(body);
      const operation = serial.then(() => perform(job)); serial = operation.catch(() => {});
      return reply(200, await operation);
    } catch (error) { return reply(400, { error: error.message }); }
  });
}
