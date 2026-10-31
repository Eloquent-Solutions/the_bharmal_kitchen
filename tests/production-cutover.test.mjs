import { readFileSync } from 'node:fs';
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseTransport } from '../scripts/tenancy/firebaseTransport.mjs';
import { CUTOVER_TEST_PROJECT as project, freezeProduction, prepareProductionPlan, applyProductionPlan, verifyProductionCopy, finishProductionCutover, reopenUnchangedLegacy } from '../scripts/tenancy/productionCutover.mjs';
let env, request;
before(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  env = await initializeTestEnvironment({ projectId: project, firestore: { host, port: Number(port), rules: readFileSync('firestore.rules','utf8') } });
  request = await firebaseTransport(project);
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await setDoc(doc(db,'users','owner'), {uid:'owner',id:'owner',email:'owner@example.test',role:'Owner',status:'active',allowedTabs:[]});
    await setDoc(doc(db,'raw_materials','rice'), {id:'rice',name:'Rice',currentStock:5,unitCost:100});
    await setDoc(doc(db,'purchase_bills','existing-bill'), {id:'existing-bill',totalAmount:500,paymentStatus:'paid'});
    await setDoc(doc(db,'settings','profile'), {name:'TBK',address:'Rajkot',cgstRate:0});
  });
});
after(async()=>env?.cleanup());
const owner=()=>env.authenticatedContext('owner',{email:'owner@example.test'}).firestore();
test('cutover freezes old owners and customers, preserves records and sign-in UIDs, and retires root access',async()=>{
  const db=owner();
  await assertSucceeds(getDoc(doc(db,'raw_materials','rice')));
  await assertFails(setDoc(doc(db,'platform_migrations','tbk'),{state:'open'}));
  const freeze=await freezeProduction(request,project,'old-commit');
  await assertFails(updateDoc(doc(db,'raw_materials','rice'),{currentStock:0}));
  await assertFails(getDoc(doc(db,'users','owner')));
  const customer=env.authenticatedContext('new-customer',{email:'new@example.test'}).firestore();
  await assertFails(setDoc(doc(customer,'users','new-customer'),{uid:'new-customer',email:'new@example.test',role:'Customer',status:'active',allowedTabs:[]}));
  const {plan}=await prepareProductionPlan(request,project);
  assert.equal(plan.id,freeze.planId);
  await applyProductionPlan(request,plan);
  assert.equal((await verifyProductionCopy(request,plan)).sourceUnchanged,true);
  const member=(await getDoc(doc(db,'restaurants','tbk','members','owner'))).data();
  assert.equal(member.uid,'owner'); assert.equal(member.role,'Owner');
  assert.equal((await getDoc(doc(db,'restaurants','tbk','purchase_bills','existing-bill'))).data().totalAmount,500);
  await finishProductionCutover(request,plan,'https://verified-deployment.vercel.app');
  await assertFails(updateDoc(doc(db,'raw_materials','rice'),{currentStock:0}));
  await assertSucceeds(updateDoc(doc(db,'restaurants','tbk','raw_materials','rice'),{currentStock:4}));
  await assert.rejects(reopenUnchangedLegacy(request,plan),/frozen/);
});
test('copy requires a production freeze and rejects source changes or a wrong project before writing',async()=>{
  await assert.rejects(prepareProductionPlan(request,project),/frozen/);
  await assert.rejects(freezeProduction(request,'the-bharmal-s-kitchen','old'),/restricted/);
  await freezeProduction(request,project,'old');
  const {plan}=await prepareProductionPlan(request,project);
  await env.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),'raw_materials','rice'),{currentStock:6}));
  await assert.rejects(applyProductionPlan(request,plan),/source changed/);
  await env.withSecurityRulesDisabled(async context=>assert.equal((await getDoc(doc(context.firestore(),'restaurants','tbk'))).exists(),false));
});
test('retries never replace a changed tenant and rollback cannot reopen divergent data',async()=>{
  await freezeProduction(request,project,'old');
  const {plan}=await prepareProductionPlan(request,project);
  await applyProductionPlan(request,plan);
  assert.equal((await applyProductionPlan(request,plan)).status,'already-complete');
  await updateDoc(doc(owner(),'restaurants','tbk','raw_materials','rice'),{currentStock:4});
  await assert.rejects(reopenUnchangedLegacy(request,plan),/differs/);
  await assertFails(updateDoc(doc(owner(),'raw_materials','rice'),{currentStock:7}));
});
test('rollback atomically suspends an unchanged copied namespace before reopening legacy writes',async()=>{
  await freezeProduction(request,project,'old');
  const {plan}=await prepareProductionPlan(request,project);
  await applyProductionPlan(request,plan);
  assert.equal((await reopenUnchangedLegacy(request,plan)).state,'open');
  await assertSucceeds(updateDoc(doc(owner(),'raw_materials','rice'),{currentStock:7}));
  await assertFails(updateDoc(doc(owner(),'restaurants','tbk','raw_materials','rice'),{currentStock:8}));
});
