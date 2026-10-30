import { collection, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { auditWrite } from './settingsCloud';
import { draftCost } from '../utils/recipeDrafts';
export async function saveRecipeDraftCloud(draft, database = db, actor = auth?.currentUser) {
  if (!database) throw new Error('Database unavailable.');
  return runTransaction(database, async (transaction) => {
    const ref = doc(database, 'recipe_drafts', draft.id); const snapshot = await transaction.get(ref);
    if (snapshot.exists()) return false;
    transaction.set(ref, { ...draft, createdAt: new Date().toISOString(), createdById: actor?.uid, updatedAt: serverTimestamp() });
    auditWrite(transaction, database, actor, 'Prepared estimated recipe draft', `recipe_drafts/${draft.id}`);
    return true;
  });
}
export async function approveRecipeDraftCloud(draft, database = db, actor = auth?.currentUser) {
  const recipeId = `RCP-${draft.dishId}`;
  const current = await getDocs(collection(database, 'recipes'));
  if (current.docs.some((entry) => entry.data().dishId === draft.dishId)) throw new Error('This dish already has a recipe. Existing recipes are preserved.');
  if (!draft.ingredients?.length || !Number.isFinite(Number(draft.yieldServings)) || Number(draft.yieldServings) <= 0 || draft.ingredients.some((item) => !item.id || !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0)) throw new Error('Map every ingredient and enter a positive stock-unit quantity.');
  const ids = draft.ingredients.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('An ingredient appears twice. Combine its quantity before approval.');
  await runTransaction(database, async (transaction) => {
    const ref = doc(database, 'recipes', recipeId); const existing = await transaction.get(ref);
    const menu = await transaction.get(doc(database, 'menu_items', draft.dishId));
    if (!menu.exists() || menu.data().recipeId) throw new Error('A recipe already exists or the dish was removed.');
    const source = await transaction.get(doc(database, 'recipe_drafts', draft.id));
    const materials = await Promise.all(ids.map((id) => transaction.get(doc(database, 'raw_materials', id))));
    if (existing.exists() || source.data()?.status !== 'draft') throw new Error('This draft was already approved or a recipe already exists. Reload recipes.');
    const stock = materials.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }));
    if (materials.some((snapshot) => !snapshot.exists()) || draftCost(draft, stock).missing) throw new Error('Every ingredient needs a current positive unit price and matching stock unit.');
    const ingredients = draft.ingredients.map((entry) => { const material = stock.find((m) => m.id === entry.id); return { id: entry.id, name: material.name, qty: Number(entry.qty), unit: material.unit, cost: Number(entry.qty) * Number(material.unitCost) }; });
    transaction.set(ref, { id: recipeId, dishId: draft.dishId, dishName: draft.dishName, yieldServings: Number(draft.yieldServings), sellingPrice: draft.sellingPrice, ingredients, instructions: draft.instructions, status: 'approved-estimate', costingBasis: 'Staff accepted estimates; not chef verified', calculatedCost: draftCost(draft, stock).total, approvedById: actor.uid, updatedAt: serverTimestamp() });
    transaction.update(doc(database, 'menu_items', draft.dishId), { recipeId, costPrice: draftCost(draft, stock).total });
    transaction.update(doc(database, 'recipe_drafts', draft.id), { status: 'approved', recipeId, approvedById: actor.uid, updatedAt: serverTimestamp() });
    auditWrite(transaction, database, actor, 'Accepted estimated recipe for stock deduction', `recipes/${recipeId}`);
  });
}
