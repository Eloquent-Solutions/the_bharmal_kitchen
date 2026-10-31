import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { realpathSync, existsSync } from 'node:fs';
import path from 'node:path';

export async function firebaseTransport(projectId, emulatorHost = process.env.FIRESTORE_EMULATOR_HOST) {
  if (emulatorHost) {
    if (!projectId.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(emulatorHost)) throw new Error('Migration emulators must use a demo project and loopback address.');
    return async (method, resource, body, query = {}) => {
      const url = new URL(`http://${emulatorHost}/v1/${resource}`);
      for (const [key, value] of Object.entries(query)) if (value != null && value !== '') url.searchParams.set(key, value);
      const response = await fetch(url, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
      if (!response.ok) { const error = new Error(`Firestore request failed (${response.status}) for ${resource}`); error.status = response.status; throw error; }
      return response.json();
    };
  }
  return firebaseManagementTransport(projectId, 'firestore');
}

export async function firebaseManagementTransport(projectId, service) {
  const endpoints = {
    firestore: { urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' },
    identity: { urlPrefix: 'https://identitytoolkit.googleapis.com', apiVersion: 'admin/v2' },
    rules: { urlPrefix: 'https://firebaserules.googleapis.com', apiVersion: 'v1' },
  };
  if (!endpoints[service]) throw new Error('Unsupported Firebase management service.');
  // Reuse the official Firebase CLI's existing sign-in. Credentials stay in its
  // auth implementation; never print or write access/refresh tokens to a plan.
  const cli = realpathSync(execFileSync('which', ['firebase'], { encoding: 'utf8' }).trim());
  const lib = process.env.TBK_FIREBASE_TOOLS_LIB || path.resolve(path.dirname(cli), '..');
  if (!existsSync(path.join(lib, 'requireAuth.js'))) throw new Error('Set TBK_FIREBASE_TOOLS_LIB to the installed firebase-tools lib directory.');
  const require = createRequire(import.meta.url);
  const { getProjectDefaultAccount } = require(path.join(lib, 'auth.js'));
  const { requireAuth } = require(path.join(lib, 'requireAuth.js'));
  const { Client } = require(path.join(lib, 'apiv2.js'));
  const account = getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('Run firebase login before migrating development data.');
  await requireAuth({ project: projectId, projectDir: process.cwd(), ...account });
  const client = new Client(endpoints[service]);
  return async (method, resource, body, query = {}) => {
    try {
      const response = await client.request({ method, path: resource, ...(body == null ? {} : { body }), queryParams: query, timeout: 30000, skipLog: { body: true, resBody: true, queryParams: true } });
      return response.body;
    } catch (error) {
      const safe = new Error(`Firestore ${method} failed for ${resource}: ${error.status || error.statusCode || error.message}`);
      safe.status = error.status || error.statusCode; throw safe;
    }
  };
}
