import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { firebaseTransport } from './tenancy/firebaseTransport.mjs';
import { PRODUCTION_PROJECT, freezeProduction, prepareProductionPlan, applyProductionPlan, verifyProductionCopy, finishProductionCutover, reopenUnchangedLegacy } from './tenancy/productionCutover.mjs';
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const command = args[0];
const folder = path.resolve(option('--backup-dir') || '.local-backups/production-tenancy-20261031');
if (!folder.startsWith(`${process.cwd()}/.local-backups/`)) throw new Error('Production backups must be in the Git-ignored private .local-backups directory.');
const planFile = path.join(folder, 'frozen-plan.json');
try {
  await mkdir(folder, { recursive: true, mode: 0o700 }); await chmod(folder, 0o700);
  const request = await firebaseTransport(PRODUCTION_PROJECT, '');
  let result;
  if (command === 'freeze') result = await freezeProduction(request, PRODUCTION_PROJECT, option('--previous-commit') || '74bb8ddff3294800764f17aabcc27941132ce8d3');
  else if (command === 'plan') {
    const { snapshot, plan } = await prepareProductionPlan(request, PRODUCTION_PROJECT);
    await writeFile(path.join(folder, 'frozen-source.json'), JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' });
    await writeFile(planFile, JSON.stringify(plan), { mode: 0o600, flag: 'wx' });
    result = { project: PRODUCTION_PROJECT, documents: plan.documents.length, planId: plan.id, sourceCounts: Object.fromEntries(Object.entries(plan.sourceCounts).filter(([,n])=>n)) };
  } else {
    const plan = JSON.parse(await readFile(planFile, 'utf8'));
    if (command === 'apply') result = await applyProductionPlan(request, plan);
    else if (command === 'verify') result = await verifyProductionCopy(request, plan);
    else if (command === 'finish') result = await finishProductionCutover(request, plan, option('--deployment'));
    else if (command === 'rollback-unfreeze') result = await reopenUnchangedLegacy(request, plan);
    else throw new Error('Use freeze, plan, apply, verify, finish, or rollback-unfreeze.');
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
