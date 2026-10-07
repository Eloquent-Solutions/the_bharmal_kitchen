/**
 * Recipe Management & Food Costing (Bill of Materials)
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Ingredients are selected directly from Raw Materials.
 * Calculates dynamic food cost and shows how many portions can be made
 * from current raw materials inventory.
 */

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  Scale,
  Percent,
  AlertTriangle,
  Layers,
  Utensils,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  getRecipes,
  saveRecipe,
  deleteRecipe,
  getMenuItems,
  getRawMaterials,
  calculateDishPortionsAvailable,
} from '../../services/dataService';
import { formatCurrency, formatRecordId } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeToDelete, setRecipeToDelete] = useState(null);

  const [formData, setFormData] = useState({
    dishName: '',
    dishId: '',
    yieldServings: 1,
    sellingPrice: 350,
    instructions: '',
    ingredients: [],
  });

  useEffect(() => {
    refreshData();
    const events = ['tbk_recipes_updated', 'tbk_raw_materials_updated', 'tbk_menu_items_updated'];
    events.forEach((event) => window.addEventListener(event, refreshData));
    return () => events.forEach((event) => window.removeEventListener(event, refreshData));
  }, []);

  const refreshData = () => {
    setRecipes(getRecipes());
    setMenuItems(getMenuItems());
    setRawMaterials(getRawMaterials());
  };

  const handleOpenAdd = () => {
    setEditingRecipe(null);
    const defaultDish = menuItems.find((dish) => !recipes.some((recipe) => recipe.dishId === dish.id || recipe.dishName.toLowerCase() === dish.name.toLowerCase()));
    if (!defaultDish) {
      toast.error('Every menu dish already has a recipe. Add a dish in Menu first.');
      return;
    }
    const defaultMat = rawMaterials.length > 0 ? rawMaterials[0] : null;

    setFormData({
      dishName: defaultDish ? defaultDish.name : '',
      dishId: defaultDish ? defaultDish.id : '',
      yieldServings: 1,
      sellingPrice: defaultDish ? defaultDish.price : 300,
      instructions: '',
      ingredients: defaultMat
        ? [
            {
              id: defaultMat.id,
              name: defaultMat.name,
              qty: '0.2',
              unit: defaultMat.unit,
              cost: Math.round(0.2 * defaultMat.unitCost),
            },
          ]
        : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      dishName: recipe.dishName,
      dishId: recipe.dishId || '',
      yieldServings: recipe.yieldServings || 1,
      sellingPrice: recipe.sellingPrice || 0,
      instructions: recipe.instructions || '',
      ingredients: recipe.ingredients ? [...recipe.ingredients] : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (recipe) => {
    setRecipeToDelete(recipe);
    setIsDeleteModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    const defaultMat = rawMaterials.length > 0 ? rawMaterials[0] : null;
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        {
          id: defaultMat ? defaultMat.id : '',
          name: defaultMat ? defaultMat.name : '',
          qty: '0.1',
          unit: defaultMat ? defaultMat.unit : 'kg',
          cost: defaultMat ? Math.round(0.1 * defaultMat.unitCost) : 0,
        },
      ],
    });
  };

  const handleRemoveIngredientRow = (index) => {
    const updated = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: updated });
  };

  const handleRawMaterialSelect = (index, rawMaterialId) => {
    const mat = rawMaterials.find((m) => m.id === rawMaterialId);
    if (!mat) return;

    const updated = [...formData.ingredients];
    const qtyNum = Number(updated[index].qty) || 0.1;
    updated[index] = {
      ...updated[index],
      id: mat.id,
      name: mat.name,
      unit: mat.unit,
      cost: Math.round(qtyNum * mat.unitCost),
    };
    setFormData({ ...formData, ingredients: updated });
  };

  const handleIngredientQtyChange = (index, qtyVal) => {
    const updated = [...formData.ingredients];
    const mat = rawMaterials.find((m) => m.id === updated[index].id);
    const numQty = parseFloat(qtyVal) || 0;
    const unitCost = mat ? mat.unitCost : 0;

    updated[index] = {
      ...updated[index],
      qty: qtyVal,
      cost: Math.round(numQty * unitCost),
    };
    setFormData({ ...formData, ingredients: updated });
  };

  const handleDishSelect = (e) => {
    const dishId = e.target.value;
    const dish = menuItems.find((m) => m.id === dishId);
    if (dish) {
      setFormData({
        ...formData,
        dishId: dish.id,
        dishName: dish.name,
        sellingPrice: dish.price,
      });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.dishName.trim()) {
      toast.error('Dish title is required for recipe');
      return;
    }
    if (!menuItems.some((dish) => dish.id === formData.dishId)) {
      toast.error('Select an existing menu dish.');
      return;
    }
    if (recipes.some((recipe) => recipe.id !== editingRecipe?.id && (recipe.dishId === formData.dishId || recipe.dishName.toLowerCase() === formData.dishName.toLowerCase()))) {
      toast.error('This menu dish already has a recipe. Edit its existing recipe instead.');
      return;
    }
    if (!Number.isInteger(Number(formData.yieldServings)) || Number(formData.yieldServings) < 1) {
      toast.error('Portion yield must be a whole number greater than zero.');
      return;
    }
    if (formData.ingredients.some((ing) => !rawMaterials.some((m) => m.id === ing.id) || !Number.isFinite(Number(ing.qty)) || Number(ing.qty) <= 0)) {
      toast.error('Each ingredient needs an existing raw material and a positive quantity.');
      return;
    }

    const payload = {
      ...(editingRecipe || {}),
      dishName: formData.dishName.trim(),
      dishId: formData.dishId,
      yieldServings: Number(formData.yieldServings) || 1,
      sellingPrice: Number(formData.sellingPrice) || 0,
      instructions: formData.instructions,
      ingredients: formData.ingredients.map((ing) => ({
        ...ing,
        cost: Number(ing.cost) || 0,
      })),
    };

    const updated = saveRecipe(payload);
    setRecipes(updated);
    setIsModalOpen(false);
    toast.success(editingRecipe ? 'Recipe updated successfully!' : 'New recipe created!');
    refreshData();
  };

  const confirmDelete = () => {
    if (!recipeToDelete) return;
    const updated = deleteRecipe(recipeToDelete.id);
    setRecipes(updated);
    setIsDeleteModalOpen(false);
    setRecipeToDelete(null);
    toast.success('Recipe deleted successfully');
  };

  const filtered = recipes.filter(
    (r) =>
      r.dishName.toLowerCase().includes(search.toLowerCase()) ||
      (r.dishId && r.dishId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: '700' }}>Recipe Management & BOM Costing</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Ingredients selected from Raw Materials. Shows real-time portions possible from current inventory.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Create Recipe
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search recipes by dish name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: 'var(--font-sm)' }}
          />
        </div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
          Showing <strong>{filtered.length}</strong> active recipes
        </div>
      </div>

      {/* Recipes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
        {filtered.map((recipe) => {
          const portionInfo = calculateDishPortionsAvailable(recipe.dishId, recipe.dishName);
          const batchCost = (recipe.ingredients || []).reduce(
            (sum, ing) => sum + (Number(ing.cost) || 0),
            0
          );
          const calculatedCost = batchCost / (Number(recipe.yieldServings) || 1);
          const foodCostPercent = recipe.sellingPrice > 0 ? Math.round((calculatedCost / recipe.sellingPrice) * 100) : 0;

          return (
            <div
              key={recipe.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: '3px solid var(--color-primary)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700' }}>{recipe.dishName}</h3>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                      Yield: {recipe.yieldServings || 1} Portion Servings
                    </div>
                  </div>
                  <span className="badge badge-primary" title={recipe.id}>{formatRecordId(recipe.id)}</span>
                </div>

                {/* Live Portions from Raw Materials Indicator */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: portionInfo.portionsAvailable > 10 ? 'rgba(34, 197, 94, 0.12)' : portionInfo.portionsAvailable > 0 ? 'rgba(245, 166, 35, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid',
                    borderColor: portionInfo.portionsAvailable > 10 ? 'rgba(34, 197, 94, 0.3)' : portionInfo.portionsAvailable > 0 ? 'rgba(245, 166, 35, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                    marginBottom: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)' }}>
                      Portions Made from Stock
                    </div>
                    <div style={{ fontSize: 'var(--font-base)', fontWeight: '800', color: portionInfo.portionsAvailable > 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
                      🔥 {portionInfo.portionsAvailable} Servings Ready
                    </div>
                  </div>
                  {portionInfo.limitingIngredient && (
                    <div style={{ fontSize: '10px', textAlign: 'right', color: 'var(--text-tertiary)', maxWidth: '140px' }}>
                      Limited by: <br />
                      <strong style={{ color: 'var(--color-warning)' }}>{portionInfo.limitingIngredient}</strong>
                    </div>
                  )}
                </div>

                {/* Financial overview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-glass-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Selling Price</div>
                    <div style={{ fontWeight: '700', fontSize: 'var(--font-sm)' }}>{formatCurrency(recipe.sellingPrice)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Portion Cost</div>
                    <div style={{ fontWeight: '700', fontSize: 'var(--font-sm)', color: 'var(--color-warning)' }}>{formatCurrency(calculatedCost)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Food Cost %</div>
                    <div style={{ fontWeight: '700', fontSize: 'var(--font-sm)', color: foodCostPercent > 35 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {foodCostPercent}%
                    </div>
                  </div>
                </div>

                {/* Ingredients snippet from Raw Materials */}
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={13} /> Raw Material Ingredients ({recipe.ingredients?.length || 0}):
                  </div>
                  {(recipe.ingredients || []).slice(0, 4).map((ing, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed rgba(255, 255, 255, 0.05)' }}>
                      <span>{ing.name} ({ing.qty} {ing.unit})</span>
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>{formatCurrency(ing.cost)}</span>
                    </div>
                  ))}
                  {(recipe.ingredients || []).length > 4 && (
                    <div style={{ color: 'var(--color-primary)', fontStyle: 'italic', marginTop: '4px' }}>
                      + {(recipe.ingredients || []).length - 4} more ingredients
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  View BOM Details
                </button>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenEdit(recipe)}
                    title="Edit Recipe & Ingredients"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleOpenDelete(recipe)}
                    title="Delete Recipe"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Recipe Modal with Raw Materials Select */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>
                {editingRecipe ? 'Edit Recipe (BOM)' : 'Create Recipe from Raw Materials'}
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="label">Target Menu Dish</label>
                  <select
                    className="input"
                    value={formData.dishId}
                    onChange={handleDishSelect}
                  >
                    {menuItems.filter((dish) => !recipes.some((recipe) => recipe.id !== editingRecipe?.id && (recipe.dishId === dish.id || recipe.dishName.toLowerCase() === dish.name.toLowerCase()))).map((m) => (
                      <option key={m.id} value={m.id}>{m.name} (₹{m.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Portion Yield (Pax)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={formData.yieldServings}
                    onChange={(e) => setFormData({ ...formData, yieldServings: e.target.value })}
                  />
                </div>
              </div>

              {/* Ingredients BOM Builder from Raw Materials */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="label" style={{ margin: 0 }}>
                    Ingredients (Select directly from Raw Materials Stock):
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={handleAddIngredientRow}
                  >
                    <Plus size={12} /> Add Raw Material Line
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {formData.ingredients.map((ing, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 32px', gap: '6px', alignItems: 'center' }}>
                      {/* Raw Material Select Dropdown */}
                      <select
                        className="input"
                        value={ing.id}
                        onChange={(e) => handleRawMaterialSelect(idx, e.target.value)}
                        style={{ fontSize: '12px', height: '34px' }}
                      >
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.name} ({rm.unit})
                          </option>
                        ))}
                      </select>

                      {/* Quantity Input */}
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Qty"
                        className="input"
                        value={ing.qty}
                        onChange={(e) => handleIngredientQtyChange(idx, e.target.value)}
                        style={{ fontSize: '12px', height: '34px' }}
                      />

                      {/* Unit Badge */}
                      <div
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ing.unit}
                      </div>

                      {/* Line Cost Display */}
                      <div
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(200, 169, 126, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--color-primary)',
                        }}
                      >
                        ₹{ing.cost || 0}
                      </div>

                      {/* Delete row */}
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemoveIngredientRow(idx)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {formData.ingredients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      No raw materials linked yet. Click "Add Raw Material Line" above.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Chef Cooking Notes & Prep Instructions</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Cooking technique, temperature, marination time..."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRecipe ? 'Save Changes' : 'Create Recipe BOM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '700', color: 'var(--color-danger)', marginBottom: '8px' }}>
              Delete Recipe
            </h3>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete the recipe for <strong>{recipeToDelete?.dishName}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Recipe BOM Details Modal */}
      {selectedRecipe && (
        <div className="modal-backdrop" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: '700' }}>{selectedRecipe.dishName}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>ID: {selectedRecipe.id}</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedRecipe(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-3)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>Raw Materials Breakdown:</h4>
              {(selectedRecipe.ingredients || []).map((ing, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '13px' }}>
                  <span>{ing.name} ({ing.qty} {ing.unit})</span>
                  <span style={{ fontWeight: '700' }}>{formatCurrency(ing.cost)}</span>
                </div>
              ))}
            </div>

            {selectedRecipe.instructions && (
              <div style={{ background: 'var(--bg-glass-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '12px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Preparation Instructions:</strong>
                {selectedRecipe.instructions}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRecipe(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
