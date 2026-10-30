// Working kitchen estimates per portion. These are proposed formulations, not
// chef-verified yields. Frying oil below is consumed/allocated oil, not fryer fill.
const ingredient = (name, grams) => ({ name, qty: grams / 1000, unit: 'kg' });
const veg = [['Ginger', 5], ['Garlic', 8], ['Capsicum', 30], ['Onion', 30]];
const seasoning = [['Salt', 2], ['White Pepper', 1], ['Cooking Oil', 20]];
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  'Cooking Oil': ['oil', 'cookingoil', 'tel', 'telnodabbo'], 'Maida': ['maida', 'maido', 'maindo', 'refinedwheatflour'],
  'Corn Flour': ['cornflour', 'cornstarch'], 'Chicken': ['chicken', 'bonelesschicken', 'freshchicken'],
  'Dark Soy Sauce': ['darksoysauce', 'soysauce'], 'Green Chilli': ['greenchilli', 'greenchilly'],
  'White Pepper': ['whitepepper', 'whitepepperpowder'], 'Black Pepper': ['blackpepper', 'blackpepperpowder', 'mari', 'maripowder'],
  'Red Chilli Powder': ['redchillipowder', 'redchillipowderpowder'], 'Tomato Ketchup': ['tomatoketchup', 'tomatosauce'],
  'Basmati Rice': ['basmatirice', 'rice'], 'Noodles': ['noodles', 'hakk anoodles'.replaceAll(' ', '')],
  'Fresh Cream': ['freshcream', 'amulfreshcream'], 'Egg': ['egg', 'eggs'], 'Curd': ['curd', 'yogurt'],
};
export function proposedIngredients(dish) {
  const name = norm(dish.name); const nonVeg = dish.type !== 'veg';
  const protein = nonVeg ? [['Chicken', 150]] : [['Capsicum', 40], ['Cabbage', 50]];
  if (name.includes('rice')) {
    const additions = name.includes('schezwan') || name.includes('triple') ? [['Schezwan Chutney', 25]] : [];
    return [...protein, ['Basmati Rice', 100], ...veg, ...seasoning, ['Dark Soy Sauce', 10], ...additions].map(([label, grams]) => ingredient(label, grams));
  }
  if (name.includes('noodle')) return [...protein, ['Noodles', 100], ['Cabbage', 40], ...veg, ...seasoning, ['Dark Soy Sauce', 10]].map(([label, grams]) => ingredient(label, grams));
  if (name.includes('chicken') || name.includes('cream') || name.includes('manchurian')) {
    if (name.includes('butterchicken') || name.includes('handi') || name.includes('kadhai') || name.includes('kadai')) return [...protein, ['Onion', 80], ['Tomato', 100], ['Ginger', 10], ['Garlic', 10], ['Cooking Oil', 15], ['Butter', 15], ['Fresh Cream', 20], ['Red Chilli Powder', 3], ['Garam Masala Powder', 2], ['Salt', 3]].map(([label, grams]) => ingredient(label, grams));
    const flour = [['Corn Flour', 25], ['Maida', 15]];
    const spices = name.includes('blackpepper') ? seasoning.filter(([label]) => label !== 'White Pepper').concat([['Black Pepper', 3]]) : seasoning;
    const sauce = name.includes('cream') ? [['Butter', 15], ['Fresh Cream', 30]] : [['Dark Soy Sauce', 10], ['Tomato Ketchup', 15], ['Green Chilli', 5]];
    return [...protein, ...flour, ...veg, ...spices, ...sauce].map(([label, grams]) => ingredient(label, grams));
  }
  return null;
}
export function draftForDish(dish, materials) {
  const proposed = proposedIngredients(dish);
  if (!proposed) return null;
  const combined = new Map();
  for (const entry of proposed) { const previous = combined.get(entry.name); combined.set(entry.name, previous ? { ...entry, qty: previous.qty + entry.qty } : entry); }
  const ingredients = [...combined.values()].map((entry) => {
    const matches = materials.filter((material) => [norm(entry.name), ...(aliases[entry.name] || [])].includes(norm(material.name)));
    const material = matches.length === 1 ? matches[0] : null;
    const unit = material?.unit || entry.unit;
    let qty = entry.qty;
    const compatible = unit === 'kg' || unit === 'g' || unit === 'gm';
    if (unit === 'g' || unit === 'gm') qty *= 1000;
    return { ...entry, proposedName: entry.name, id: compatible ? material?.id || '' : '', name: material?.name || entry.name, qty, unit, cost: material && compatible ? qty * Number(material.unitCost || 0) : 0 };
  });
  return { id: `DRAFT-${dish.id}`, dishId: dish.id, dishName: dish.name, yieldServings: 1, sellingPrice: Number(dish.price || 0), status: 'draft', ingredients,
    instructions: 'Working estimate per portion. Verify chicken cut, dry rice/noodle weights, final yield, and ingredient form. Oil is an estimated consumption allocation, not frying-vessel fill. No chef verification. Compare a weighed trial batch before relying on margins.',
    assumptions: ['Single portion; assumed 150 g chicken for non-vegetarian dishes.', 'Rice/noodles use dry weights; cooked yield needs a trial batch.', 'Salt, sauce, spice, and absorbed oil quantities are estimates.', 'No substitutions between maida and corn flour; missing stock mappings require review.'] };
}
export function draftCost(draft, materials) {
  let total = 0; let missing = 0;
  for (const ingredient of draft.ingredients) {
    const material = materials.find((entry) => entry.id === ingredient.id);
    if (!material || Number(material.unitCost) <= 0 || material.unit !== ingredient.unit || Number(ingredient.qty) <= 0) missing++;
    else total += Number(ingredient.qty) * Number(material.unitCost);
  }
  return { total: Number((total / Number(draft.yieldServings || 1)).toFixed(2)), missing };
}
