import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { firebaseTransport } from './tenancy/firebaseTransport.mjs';
import { DEVELOPMENT_PROJECT, requireDevelopmentProject, readLegacySnapshot, migrationPlan, applyMigration, normalizeLegacyRestaurantSettings } from './tenancy/copyRestaurant.mjs';

const argumentsList = process.argv.slice(2);
const option = (key, fallback) => { const index = argumentsList.indexOf(key); return index >= 0 ? argumentsList[index + 1] : fallback; };
const project = option('--project', DEVELOPMENT_PROJECT);
const planFile = option('--plan');
if (!planFile) throw new Error('Supply --plan /private/path/tbk-plan.json. This file contains private development business records and must not be committed.');
requireDevelopmentProject(project);
const absolute = path.resolve(planFile);
if (!absolute.includes(`${path.sep}tmp${path.sep}`) && !absolute.includes('.local')) throw new Error('Store the private plan in a temporary directory or a .local directory excluded from Git.');
try {
  const request = await firebaseTransport(project);
  if (argumentsList.includes('--apply') || argumentsList.includes('--normalize-legacy-settings')) {
    const plan = JSON.parse(await readFile(absolute, 'utf8'));
    if (plan.projectId !== project) throw new Error('The plan belongs to a different project.');
    console.log(JSON.stringify(await (argumentsList.includes('--normalize-legacy-settings') ? normalizeLegacyRestaurantSettings(request, plan) : applyMigration(request, plan)), null, 2));
  } else {
    const snapshot = await readLegacySnapshot(request, project);
    const plan = migrationPlan(snapshot, 'tbk', 'The Bharmals Kitchen');
    await mkdir(path.dirname(absolute), { recursive: true, mode: 0o700 });
    await writeFile(absolute, JSON.stringify(plan), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ mode: 'dry-run', project, restaurant: plan.restaurantId, documents: plan.documents.length, sourceCounts: plan.sourceCounts, planFile: absolute }, null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
