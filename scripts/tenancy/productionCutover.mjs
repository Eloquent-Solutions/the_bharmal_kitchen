import { createHash, randomUUID } from 'node:crypto';
import { createRestaurantCopyTools } from './copyRestaurant.mjs';
export const PRODUCTION_PROJECT = 'the-bharmal-kitchen';
export const CUTOVER_TEST_PROJECT = 'demo-tbk-production-cutover';
const str = (value) => ({ stringValue: String(value) });
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const dataHash = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function requireProductionProject(project) {
  if (![PRODUCTION_PROJECT, CUTOVER_TEST_PROJECT].includes(project)) throw new Error('This runner is restricted to TBK production and its disposable emulator test project.');
}
export const productionCopy = createRestaurantCopyTools(requireProductionProject);
const base = (project) => `projects/${project}/databases/(default)/documents`;
const controlName = (project) => `${base(project)}/platform_migrations/tbk`;
async function readMaybe(request, name) {
  try { return await request('GET', name); } catch (error) { if (error.status === 404) return null; throw error; }
}
export async function freezeProduction(request, project, previousCommit) {
  requireProductionProject(project);
  const existing = await readMaybe(request, controlName(project));
  if (existing) throw new Error('A cutover record already exists. Resume its private plan; do not replace or reopen it.');
  const id = randomUUID();
  await request('POST', `${base(project)}:commit`, { writes: [{ update: { name: controlName(project), fields: { state: str('frozen'), planId: str(id), previousCommit: str(previousCommit), startedAt: str(new Date().toISOString()), destination: str('https://tbk.eloquentsolutions.in') } }, currentDocument: { exists: false } }] });
  return { project, planId: id, state: 'frozen' };
}
async function frozenControl(request, project, id) {
  requireProductionProject(project);
  const control = await readMaybe(request, controlName(project));
  if (control?.fields.state?.stringValue !== 'frozen' || (id && control.fields.planId?.stringValue !== id)) throw new Error('A matching frozen production cutover is required.');
  return control;
}
export async function prepareProductionPlan(request, project) {
  const control = await frozenControl(request, project);
  const snapshot = await productionCopy.readLegacySnapshot(request, project);
  const plan = productionCopy.migrationPlan(snapshot, 'tbk', 'The Bharmals Kitchen');
  return { snapshot, plan: { ...plan, id: control.fields.planId.stringValue, kind: 'tbk-production-cutover-v1' } };
}
async function assertFrozenSource(request, plan) {
  await frozenControl(request, plan.projectId, plan.id);
  if (plan.kind !== 'tbk-production-cutover-v1' || plan.restaurantId !== 'tbk') throw new Error('A TBK production plan is required.');
  const source = await productionCopy.readLegacySnapshot(request, plan.projectId);
  if (dataHash(source.documents) !== plan.sourceHash) throw new Error('Production source changed after the frozen snapshot. Nothing may overwrite or activate this copy.');
}
export async function applyProductionPlan(request, plan) {
  await assertFrozenSource(request, plan);
  return productionCopy.applyMigration(request, plan);
}
export async function verifyProductionCopy(request, plan) {
  await assertFrozenSource(request, plan);
  if (dataHash(plan.documents) !== plan.dataHash) throw new Error('The private plan changed.');
  let verified = 0;
  for (let index = 0; index < plan.documents.length; index += 100) {
    const expected = plan.documents.slice(index, index + 100);
    const rows = await request('POST', `${base(plan.projectId)}:batchGet`, { documents: expected.map(record => record.name) });
    const actual = new Map(rows.filter(row => row.found).map(row => [row.found.name, row.found.fields || {}]));
    for (const record of expected) {
      if (!actual.has(record.name) || dataHash(actual.get(record.name)) !== dataHash(record.fields)) throw new Error(`Copied record differs: ${record.name}`);
      verified++;
    }
  }
  const registry = await request('GET', `${base(plan.projectId)}/restaurants/tbk`);
  if (registry.fields.status.stringValue !== 'active') throw new Error('The verified restaurant is not active.');
  return { project: plan.projectId, restaurant: 'tbk', verified, sourceUnchanged: true, counts: plan.sourceCounts };
}
export async function finishProductionCutover(request, plan, deployment) {
  if (!/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(deployment)) throw new Error('Record the verified Vercel deployment URL.');
  const control = await frozenControl(request, plan.projectId, plan.id);
  const manifest = await request('GET', `${base(plan.projectId)}/restaurants/tbk/_migrations/initial`);
  if (manifest.fields.planId.stringValue !== plan.id || manifest.fields.dataHash.stringValue !== plan.dataHash) throw new Error('The activated copy belongs to a different plan.');
  await request('POST', `${base(plan.projectId)}:commit`, { writes: [{ update: { name: control.name, fields: { ...control.fields, state: str('cutover'), completedAt: str(new Date().toISOString()), deployment: str(deployment) } }, currentDocument: { updateTime: control.updateTime } }] });
  return { project: plan.projectId, state: 'cutover', deployment, legacyWritesDisabled: true };
}
export async function reopenUnchangedLegacy(request, plan) {
  // Suspend the copied namespace in the SAME commit that reopens legacy writes.
  // Check every active copied document's updateTime to close the verify/rollback
  // race. An incomplete provisioning copy is already inaccessible to clients.
  await assertFrozenSource(request, plan);
  const control = await frozenControl(request, plan.projectId, plan.id);
  const registry = await readMaybe(request, `${base(plan.projectId)}/restaurants/tbk`);
  const writes = [];
  if (registry) {
    if (registry.fields.migrationId?.stringValue !== plan.id) throw new Error('A different migration owns this namespace.');
    if (registry.fields.status.stringValue === 'active') {
      if (plan.documents.length > 498) throw new Error('Review rollback preconditions for this larger migration.');
      const rows = await request('POST', `${base(plan.projectId)}:batchGet`, { documents: plan.documents.map(record => record.name) });
      const actual = new Map(rows.filter(row => row.found).map(row => [row.found.name, row.found]));
      for (const record of plan.documents) {
        const current = actual.get(record.name);
        if (!current || dataHash(current.fields) !== dataHash(record.fields)) throw new Error(`Copied record differs: ${record.name}`);
        writes.push({ verify: current.name, currentDocument: { updateTime: current.updateTime } });
      }
    } else if (registry.fields.status.stringValue !== 'provisioning') throw new Error('Review this restaurant state before rollback.');
    writes.push({ update: { name: registry.name, fields: { ...registry.fields, status: str('rollback-suspended') } }, currentDocument: { updateTime: registry.updateTime } });
  }
  writes.push({ update: { name: control.name, fields: { ...control.fields, state: str('open'), rollbackAt: str(new Date().toISOString()) } }, currentDocument: { updateTime: control.updateTime } });
  await request('POST', `${base(plan.projectId)}:commit`, { writes });
  return { state: 'open' };
}
