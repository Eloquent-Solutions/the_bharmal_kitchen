import { useState } from 'react';
import toast from 'react-hot-toast';
import useCloudCollection from '../hooks/useCloudCollection';
import LoadingButton from './LoadingButton';
import { FinanceModal, FinanceTable } from './Finance/FinanceUI';
import { draftForDish, draftCost } from '../utils/recipeDrafts';
import { saveRecipeDraftCloud, approveRecipeDraftCloud } from '../services/recipeDraftsCloud';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { isDemoMode } from '../firebase/config';

export default function RecipeDraftPanel({ menu, materials, recipes }) {
  const { role } = useAuth();
  const canAccept = ['Owner', 'Admin', 'Manager'].includes(role);
  const state = useCloudCollection('recipe_drafts'); const [busy, setBusy] = useState(false); const [review, setReview] = useState(null); const [accepted, setAccepted] = useState(false);
  if (isDemoMode) return null;
  const drafts = state.rows.filter((row) => row.status === 'draft');
  const unlinked = menu.filter((dish) => !recipes.some((recipe) => recipe.dishId === dish.id));
  async function generate() {
    setBusy(true); let count = 0; let skipped = 0;
    try { for (const dish of unlinked) { const draft = draftForDish(dish, materials); if (!draft) { skipped++; continue; } if (await saveRecipeDraftCloud(draft)) count++; } toast.success(`${count} new drafts prepared.${skipped ? ` ${skipped} dishes need manual formulation.` : ''}`); }
    catch (error) { toast.error(error.message); } finally { setBusy(false); }
  }
  return <section className="card settings-form"><div className="finance-heading"><div><h3>Proposed recipes</h3><p>Prepare working estimates for dishes without recipes. Drafts do not deduct stock or change the existing recipes.</p></div><LoadingButton className="btn btn-secondary" loading={busy} disabled={!canAccept || !unlinked.length || Boolean(state.error)} onClick={generate}>Prepare recipe drafts</LoadingButton></div>{state.error && <p role="alert">{state.error}</p>}
    {drafts.length > 0 && <FinanceTable rows={drafts} columns={[{ key: 'dishName', label: 'Dish' }, { key: 'cost', label: 'Estimated ingredient cost', render: (row) => { const cost = draftCost(row, materials); return `${formatCurrency(cost.total)}${cost.missing ? ` + ${cost.missing} unresolved ingredients` : ''}`; } }, { key: 'review', label: 'Action', render: (row) => <button className="btn btn-secondary btn-sm" onClick={() => { setReview({ ...row, ingredients: row.ingredients.map((item) => ({ ...item })) }); setAccepted(false); }}>Review draft</button> }]} />}
    {review && <FinanceModal title={`Review ${review.dishName}`} busy={busy} onClose={() => setReview(null)}><form onSubmit={async (event) => { event.preventDefault(); if (!accepted) return; setBusy(true); try { await approveRecipeDraftCloud(review); setReview(null); toast.success('Estimated recipe accepted. Stock deduction is now enabled.'); } catch (error) { toast.error(error.message); } finally { setBusy(false); } }}><p>{review.instructions}</p><label className="finance-field">Portion yield<input className="input" type="number" min="0.1" step="0.1" value={review.yieldServings} onChange={(event) => setReview({ ...review, yieldServings: event.target.value })} /></label>
      {review.ingredients.map((ingredient, index) => <div key={index} className="finance-field"><label htmlFor={`draft-${index}`}>{ingredient.proposedName || ingredient.name}</label><select className="input" id={`draft-${index}`} required value={ingredient.id} onChange={(event) => { const material = materials.find((m) => m.id === event.target.value); setReview({ ...review, ingredients: review.ingredients.map((item, i) => i === index ? { ...item, id: material?.id || '', name: material?.name || item.name, unit: material?.unit || item.unit, qty: item.unit === material?.unit ? item.qty : item.unit === 'kg' && ['g', 'gm'].includes(material?.unit) ? Number(item.qty) * 1000 : ['g', 'gm'].includes(item.unit) && material?.unit === 'kg' ? Number(item.qty) / 1000 : '' } : item) }); }}><option value="">Choose stock ingredient</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}</select><label>Quantity in {ingredient.unit}<input className="input" type="number" min="0.001" step="0.001" required value={ingredient.qty} onChange={(event) => setReview({ ...review, ingredients: review.ingredients.map((item, i) => i === index ? { ...item, qty: event.target.value } : item) })} /></label></div>)}
      <p>Estimated ingredient cost: {formatCurrency(draftCost(review, materials).total)}. Unresolved ingredients: {draftCost(review, materials).missing}.</p><label className="finance-checkbox"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />I reviewed the ingredients, units, and yield and accept these estimates for stock deduction. They remain unverified kitchen estimates.</label><LoadingButton type="submit" className="btn btn-primary" loading={busy} disabled={!canAccept || !accepted || Boolean(draftCost(review, materials).missing)}>Accept recipe estimate</LoadingButton>
    </form></FinanceModal>}
  </section>;
}
