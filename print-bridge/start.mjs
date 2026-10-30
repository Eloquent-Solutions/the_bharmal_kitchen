import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createBridge } from './server.mjs';
const configPath = fileURLToPath(new URL('./config.local.json', import.meta.url));
let config;
try { config = JSON.parse(await readFile(configPath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  config = { token: randomBytes(32).toString('hex'), origins: ['https://the-bharmal-kitchen.vercel.app', 'http://127.0.0.1:5173', 'http://localhost:5173'], targets: [] };
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log('Created config.local.json. Add your printer IP and port under targets before printing.');
}
const server = await createBridge(config, { statePath: fileURLToPath(new URL('./jobs.local.json', import.meta.url)) });
server.listen(19771, '127.0.0.1', () => console.log('TBK print bridge running at http://127.0.0.1:19771. Pair using the token in config.local.json.'));
