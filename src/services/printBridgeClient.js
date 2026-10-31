import { db, isMultiRestaurant, restaurantRuntime } from '../firebase/config';
import { restaurantCacheKey, restaurantBridgeId } from '../tenancy/identity';
const KEY = isMultiRestaurant && restaurantRuntime.restaurantId ? restaurantCacheKey({ projectId: db?.app?.options.projectId, restaurantId: restaurantRuntime.restaurantId, uid: 'print-station' }, 'bridge') : 'tbk_print_bridge_device_v1';
export function getBridgeDevice() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function pairBridge(token) {
  if (!/^[a-f0-9]{64}$/i.test(token.trim())) throw new Error('Paste the 64-character pairing token from the Windows bridge configuration.');
  const device = { token: token.trim(), deviceId: getBridgeDevice()?.deviceId || crypto.randomUUID() };
  localStorage.setItem(KEY, JSON.stringify(device)); return device;
}
export function unpairBridge() { localStorage.removeItem(KEY); }
export async function callBridge(path, job, device = getBridgeDevice()) {
  if (!device?.token) throw new Error('Pair this computer with the local print bridge first.');
  const response = await fetch(`http://127.0.0.1:19771${path}`, { method: job ? 'POST' : 'GET', headers: { Authorization: `Bearer ${device.token}`, ...(job ? { 'Content-Type': 'application/json' } : {}) }, body: job ? JSON.stringify({ ...job, id: restaurantBridgeId(restaurantRuntime.restaurantId, job.id) }) : undefined, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 401 ? 'Pairing token was rejected.' : `Print bridge returned ${response.status}. Check its allowed origins and printer targets.`);
  const result = await response.json(); if (result.error && !result.status) throw new Error(result.error); return result;
}
