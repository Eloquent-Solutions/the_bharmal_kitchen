# Changelog
## The Bharmals Kitchen — Restaurant Management System (RMS)

All notable changes and milestones for this project will be documented in this file.

---

### [1.1.0] — 2026-09-25

#### Added & Enhanced
- **Central Data Service (`dataService.js`):** Reactive, persistent data store with localStorage backup and automatic Firestore synchronization.
- **Full Categories CRUD (`CategoriesPage.jsx`):** Added Add Category, Edit Category, Delete Category with confirmation modal, and live status toggling.
- **Full Menu Dishes CRUD (`MenuItemsPage.jsx`):** Added Add Dish, Edit Dish, Delete Dish with confirmation modal, multi-category selection, food cost margin calculation, and 86 (sold out) toggle.
- **Full Recipes & BOM CRUD (`RecipesPage.jsx`):** Added Create Recipe, Edit Recipe, Delete Recipe, interactive multi-line BOM ingredient cost calculation, and portion yields.
- **Dynamic POS Integration (`POSPage.jsx`):** Real-time synchronization of newly created categories and dishes in POS cart and ordering terminal.
- **Zero 404 Routing:** Added and mapped all missing routes (`StockLedgerPage`, `WastagePage`, `StockCountPage`, `UtensilsPage`, `LoyaltyPage`, `PromotionsPage`, `OrderReportsPage`, `InventoryReportsPage`, `FoodCostReportsPage`, `StaffReportsPage`, `ProfitReportsPage`, `TaxReportsPage`, `POSSettingsPage`, `TaxSettingsPage`, `KOTPage`).
- **Production Build:** Verified zero-error compilation across all 42+ modules with Vite.
