/**
 * Central Data & State Service
 * The Bharmals Kitchen — Restaurant Management System
 *
 * Direct Bi-directional Firebase Firestore Sync + Reactive Local Cache Fallback.
 * All modules (Menu, Categories, Recipes, Raw Materials, Utensils, Combos, Modifiers,
 * Staff, Branches, Users, Tables, Suppliers, Purchase Bills, Orders) support full
 * Create, Read, Update, and Delete (CRUD).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, isDemoMode, isInventoryOnly, isBillingEnabled } from '../firebase/config';
import { formatRecordId } from '../utils/recordIds';

const inventoryId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
let inventorySyncState = { ready: false, error: null };

export function getInventorySyncState() {
  return inventorySyncState;
}

function updateInventorySyncState(next) {
  inventorySyncState = { ...inventorySyncState, ...next };
  if (isInventoryOnly) window.dispatchEvent(new CustomEvent('tbk_inventory_sync_state', { detail: inventorySyncState }));
}

/**
 * Auto-synchronize Firestore remote collections into local reactive stores on load
 */
export async function initializeFirebaseDataSync(shouldStop = () => false, role = '') {
  if (!db) return;
  if (isInventoryOnly) updateInventorySyncState({ ready: false, error: null });
  const collectionsToSync = [
    { col: 'menu_items', key: 'tbk_menu_items', event: 'tbk_menu_items_updated', realtime: isBillingEnabled },
    { col: 'categories', key: 'tbk_categories', event: 'tbk_categories_updated', realtime: isBillingEnabled },
    { col: 'combos', key: 'tbk_combos', event: 'tbk_combos_updated' },
    { col: 'modifiers', key: 'tbk_modifiers', event: 'tbk_modifiers_updated' },
    { col: 'recipes', key: 'tbk_recipes', event: 'tbk_recipes_updated', realtime: true },
    { col: 'raw_materials', key: 'tbk_raw_materials', event: 'tbk_raw_materials_updated', realtime: true },
    { col: 'utensils', key: 'tbk_utensils', event: 'tbk_utensils_updated', realtime: true },
    { col: 'orders', key: 'tbk_orders', event: 'tbk_order_changed', realtime: true },
    { col: 'tables', key: 'tbk_tables', event: 'tbk_tables_updated', realtime: true },
    { col: 'staff', key: 'tbk_staff', event: 'tbk_staff_updated' },
    { col: 'branches', key: 'tbk_branches', event: 'tbk_branches_updated' },
    { col: 'users', key: 'tbk_users', event: 'tbk_users_updated', realtime: true },
    { col: 'suppliers', key: 'tbk_suppliers', event: 'tbk_suppliers_updated', realtime: true },
    { col: 'supply_categories', key: 'tbk_supply_categories', event: 'tbk_supply_categories_updated' },
    { col: 'kitchen_stations', key: 'tbk_kitchen_stations', event: 'tbk_kitchen_stations_updated' },
    { col: 'purchase_bills', key: 'tbk_purchase_bills', event: 'tbk_purchase_bills_updated', realtime: true },
    { col: 'purchase_orders', key: 'tbk_purchase_orders', event: 'tbk_purchase_orders_updated' },
    { col: 'stock_movements', key: 'tbk_stock_movements', event: 'tbk_stock_movements_updated', realtime: true },
    { col: 'wastage', key: 'tbk_wastage', event: 'tbk_wastage_updated', realtime: true },
    { col: 'promotions', key: 'tbk_promotions', event: 'tbk_promotions_updated' },
    { col: 'kots', key: 'tbk_kots', event: 'tbk_kots_updated', realtime: true },
    { col: 'printers', key: 'tbk_printers', event: 'tbk_printers_updated' },
    { col: 'print_routing', key: 'tbk_print_routing', event: 'tbk_print_routing_updated' },
    { col: 'print_queue', key: 'tbk_print_queue', event: 'tbk_print_queue_updated' },
    { col: 'audit_logs', key: 'tbk_audit_logs', event: 'tbk_audit_logs_updated' },
    { col: 'customers', key: 'tbk_customers', event: 'tbk_customer_changed' },
    { col: 'reservations', key: 'tbk_reservations', event: 'tbk_reservations_updated' },
    { col: 'waitlist', key: 'tbk_waitlist', event: 'tbk_waitlist_updated' },
    { col: 'leaves', key: 'tbk_leaves', event: 'tbk_leaves_updated' },
    { col: 'advances', key: 'tbk_advances', event: 'tbk_advances_updated' },
    { col: 'attendance', key: 'tbk_attendance', event: 'tbk_attendance_updated' },
    { col: 'cash_transactions', key: 'tbk_cash_transactions', event: 'tbk_cash_transactions_updated' },
    { col: 'expenses', key: 'tbk_expenses', event: 'tbk_expenses_updated' },
    { col: 'day_close', key: 'tbk_day_close_history', event: 'tbk_day_close_updated' },
    { col: 'shifts', key: 'tbk_shifts', event: 'tbk_shifts_updated' },
    { col: 'inbox', key: 'tbk_inbox', event: 'tbk_inbox_updated' },
  ];

  // Sync settings documents
  const settingsDocs = [
    { id: 'receipt_template', key: 'tbk_receipt_template' },
    { id: 'restaurant', key: 'tbk_restaurant_settings' },
    { id: 'pos', key: 'tbk_pos_settings' },
    { id: 'notifications', key: 'tbk_notification_settings' },
    { id: 'upi', key: 'tbk_upi_settings' },
    { id: 'terms', key: 'tbk_terms' },
    { id: 'channels', key: 'tbk_channel_settings' },
    { id: 'loyalty', key: 'tbk_loyalty_tiers' },
  ];

  for (const s of (isInventoryOnly ? (isBillingEnabled ? settingsDocs.filter(({ id }) => id === 'restaurant' || id === 'channels') : []) : settingsDocs)) {
    if (shouldStop()) return () => {};
    try {
      const snap = await getDoc(doc(db, 'settings', s.id));
      if (shouldStop()) return () => {};
      if (snap.exists()) {
        const val = snap.data();
        localStorage.setItem(storageKey(s.key), JSON.stringify(val));
      }
    } catch (e) {
      // Ignore initial read note
    }
  }

  const unsubscribers = [];

  const inventoryCollections = new Set(
    ['Owner', 'Admin', 'Manager', 'Chef', 'Kitchen Staff', 'Inventory Manager', 'Accountant'].includes(role)
      ? ['raw_materials', 'utensils', 'stock_movements', 'wastage']
      : []
  );
  if (['Owner', 'Admin', 'Manager', 'Inventory Manager'].includes(role)) {
    inventoryCollections.add('suppliers');
    inventoryCollections.add('purchase_bills');
  }
  if (['Owner', 'Admin'].includes(role)) inventoryCollections.add('users');
  if (isBillingEnabled && ['Owner', 'Admin', 'Manager'].includes(role)) {
    ['menu_items', 'categories', 'recipes', 'orders', 'tables'].forEach((col) => inventoryCollections.add(col));
  }
  for (const item of (isInventoryOnly ? collectionsToSync.filter(({ col }) => inventoryCollections.has(col)) : collectionsToSync)) {
    if (shouldStop()) break;
    try {
      const snap = await getDocs(collection(db, item.col));
      if (shouldStop()) break;
      const remoteData = [];
      snap.forEach((d) => {
        remoteData.push({ id: d.id, ...d.data() });
      });
      localStorage.setItem(storageKey(item.key), JSON.stringify(remoteData));
      try {
        window.dispatchEvent(new CustomEvent(item.event, { detail: remoteData }));
      } catch (e) { }

      // Attach real-time snapshot listener for operational collections
      if (item.realtime) {
        const unsubscribe = onSnapshot(collection(db, item.col), (snapshot) => {
          if (shouldStop()) return;
          const liveData = [];
          snapshot.forEach((d) => liveData.push({ id: d.id, ...d.data() }));
          localStorage.setItem(storageKey(item.key), JSON.stringify(liveData));
          try {
            window.dispatchEvent(new CustomEvent(item.event, { detail: liveData }));
          } catch (e) { }
        }, (err) => {
          if (shouldStop()) return;
          console.warn(`Realtime onSnapshot (${item.col}):`, err.message);
          if (isInventoryOnly) updateInventorySyncState({ ready: false, error: `Could not synchronize ${item.col}.` });
        });
        unsubscribers.push(unsubscribe);
      }
    } catch (e) {
      console.warn(`Initial sync for ${item.col} note:`, e.message);
      if (isInventoryOnly) updateInventorySyncState({ ready: false, error: `Could not synchronize ${item.col}.` });
    }
  }

  if (isInventoryOnly && !shouldStop() && !inventorySyncState.error) updateInventorySyncState({ ready: true });
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

// ─── Default Master Data ──────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  {
    id: 'CAT-01',
    name: 'Starters & Tandoor',
    defaultStation: 'Tandoor',
    sortOrder: 1,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'CAT-02',
    name: 'Mains & Biryanis',
    defaultStation: 'Curry / Biryani',
    sortOrder: 2,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'CAT-03',
    name: 'Breads & Accompaniments',
    defaultStation: 'Tandoor',
    sortOrder: 3,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'CAT-04',
    name: 'Desserts & Beverages',
    defaultStation: 'Desserts & Beverages',
    sortOrder: 4,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'CAT-05',
    name: 'Bohra Special Thaal',
    defaultStation: 'Curry / Biryani',
    sortOrder: 5,
    isActive: true,
    image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=500&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_MENU_ITEMS = [
  {
    id: 'ITEM-01',
    name: 'Mutton Bohra Khichda',
    category: 'Mains & Biryanis',
    categoryId: 'CAT-02',
    price: 420,
    costPrice: 165,
    type: 'non-veg',
    station: 'Curry / Biryani',
    prepTime: 20,
    isAvailable: true,
    isSpecial: true,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    description: 'Traditional slow-cooked mutton with cracked wheat, 5 lentils, pure desi ghee, and caramelised birista.',
  },
  {
    id: 'ITEM-02',
    name: 'Chicken Biryani (Dum Handi)',
    category: 'Mains & Biryanis',
    categoryId: 'CAT-02',
    price: 340,
    costPrice: 120,
    type: 'non-veg',
    station: 'Curry / Biryani',
    prepTime: 15,
    isAvailable: true,
    isSpecial: false,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    description: 'Aromatic long-grain basmati layered with tender spiced chicken handi, saffron, and slow-steamed under dough seal.',
  },
  {
    id: 'ITEM-03',
    name: 'Mutton Seekh Kebab (4 Pcs)',
    category: 'Starters & Tandoor',
    categoryId: 'CAT-01',
    price: 380,
    costPrice: 140,
    type: 'non-veg',
    station: 'Tandoor',
    prepTime: 12,
    isAvailable: true,
    isSpecial: true,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80',
    description: 'Hand-minced spiced goat meat skewers roasted in clay tandoor oven, served with mint dip and lachha onion.',
  },
  {
    id: 'ITEM-04',
    name: 'Paneer Tikka Angara',
    category: 'Starters & Tandoor',
    categoryId: 'CAT-01',
    price: 290,
    costPrice: 95,
    type: 'veg',
    station: 'Tandoor',
    prepTime: 10,
    isAvailable: true,
    isSpecial: false,
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    description: 'Charcoal-smoked malai paneer cubes marinated in Kashmiri chili curd with crisp bell peppers.',
  },
  {
    id: 'ITEM-05',
    name: 'Butter Naan',
    category: 'Breads & Accompaniments',
    categoryId: 'CAT-03',
    price: 45,
    costPrice: 12,
    type: 'veg',
    station: 'Tandoor',
    prepTime: 5,
    isAvailable: true,
    isSpecial: false,
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80',
    description: 'Fluffy tandoori flatbread brushed with golden salted Amul butter.',
  },
  {
    id: 'ITEM-06',
    name: 'Dal Makhani Bukhara',
    category: 'Mains & Biryanis',
    categoryId: 'CAT-02',
    price: 260,
    costPrice: 80,
    type: 'veg',
    station: 'Curry / Biryani',
    prepTime: 10,
    isAvailable: true,
    isSpecial: false,
    image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&auto=format&fit=crop&q=80',
    description: 'Overnight slow-simmered whole black lentils with pure white dairy cream, butter, and mild spices.',
  },
  {
    id: 'ITEM-07',
    name: 'Gulab Jamun (Warm, 2 Pcs)',
    category: 'Desserts & Beverages',
    categoryId: 'CAT-04',
    price: 80,
    costPrice: 25,
    type: 'veg',
    station: 'Desserts & Beverages',
    prepTime: 3,
    isAvailable: true,
    isSpecial: false,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    description: 'Melt-in-mouth cottage cheese and mawa dumplings soaked in cardamom rose syrup.',
  },
];

export const DEFAULT_RAW_MATERIALS = [
  { id: 'RM-101', name: 'Fresh Chicken (Curry Cut)', category: 'Meat & Poultry', currentStock: 25.0, unit: 'kg', reorderLevel: 10.0, unitCost: 180, supplier: 'Al-Madina Poultry Farm' },
  { id: 'RM-102', name: 'Fresh Goat Mutton (Mix)', category: 'Meat & Poultry', currentStock: 12.0, unit: 'kg', reorderLevel: 8.0, unitCost: 650, supplier: 'Deccan Halal Mutton Traders' },
  { id: 'RM-103', name: 'Daawat Basmati Rice (XXL)', category: 'Grains & Pulses', currentStock: 80.0, unit: 'kg', reorderLevel: 30.0, unitCost: 110, supplier: 'Bharmal Wholesale Grocery' },
  { id: 'RM-104', name: 'Pure Desi Ghee (Amul)', category: 'Dairy', currentStock: 15.0, unit: 'kg', reorderLevel: 5.0, unitCost: 590, supplier: 'Amul Dairy Authorized Distributors' },
  { id: 'RM-105', name: 'Fresh Malai Paneer', category: 'Dairy', currentStock: 6.5, unit: 'kg', reorderLevel: 4.0, unitCost: 320, supplier: 'Amul Dairy Authorized Distributors' },
  { id: 'RM-106', name: 'Onions (Nashik Red)', category: 'Vegetables', currentStock: 45.0, unit: 'kg', reorderLevel: 20.0, unitCost: 35, supplier: 'Vashi APMC Market' },
  { id: 'RM-107', name: 'Kashmiri Saffron & Spices', category: 'Spices', currentStock: 50.0, unit: 'portion', reorderLevel: 15.0, unitCost: 27, supplier: 'Royal Spices & Dry Fruits' },
  { id: 'RM-108', name: 'Ginger & Garlic Paste (Fresh)', category: 'Vegetables', currentStock: 10.0, unit: 'kg', reorderLevel: 5.0, unitCost: 95, supplier: 'House Made / APMC' },
  { id: 'RM-109', name: 'Black Urad Dal (Bukhara)', category: 'Grains & Pulses', currentStock: 20.0, unit: 'kg', reorderLevel: 10.0, unitCost: 130, supplier: 'Bharmal Wholesale Grocery' },
  { id: 'RM-110', name: 'Wheat Maida (Refined Flour)', category: 'Grains & Pulses', currentStock: 35.0, unit: 'kg', reorderLevel: 15.0, unitCost: 40, supplier: 'Bharmal Wholesale Grocery' },
  { id: 'RM-111', name: 'Gulab Jamun Khoya Mix', category: 'Dairy', currentStock: 8.0, unit: 'kg', reorderLevel: 3.0, unitCost: 240, supplier: 'Amul Dairy Authorized Distributors' },
];

export const DEFAULT_RECIPES = [
  {
    id: 'RCP-01',
    dishId: 'ITEM-02',
    dishName: 'Chicken Biryani (Dum Handi)',
    yieldServings: 1,
    sellingPrice: 340,
    ingredients: [
      { id: 'RM-101', name: 'Fresh Chicken (Curry Cut)', qty: '0.25', unit: 'kg', cost: 45 },
      { id: 'RM-103', name: 'Daawat Basmati Rice (XXL)', qty: '0.20', unit: 'kg', cost: 22 },
      { id: 'RM-104', name: 'Pure Desi Ghee (Amul)', qty: '0.03', unit: 'kg', cost: 18 },
      { id: 'RM-106', name: 'Onions (Nashik Red)', qty: '0.10', unit: 'kg', cost: 8 },
      { id: 'RM-107', name: 'Kashmiri Saffron & Spices', qty: '1', unit: 'portion', cost: 27 },
    ],
    calculatedCost: 120,
    instructions: '1. Marinate chicken. 2. Par-boil basmati. 3. Layer and dum cook for 15 mins.',
  },
  {
    id: 'RCP-02',
    dishId: 'ITEM-01',
    dishName: 'Mutton Bohra Khichda',
    yieldServings: 1,
    sellingPrice: 420,
    ingredients: [
      { id: 'RM-102', name: 'Fresh Goat Mutton (Mix)', qty: '0.20', unit: 'kg', cost: 130 },
      { id: 'RM-103', name: 'Daawat Basmati Rice (XXL)', qty: '0.10', unit: 'kg', cost: 11 },
      { id: 'RM-104', name: 'Pure Desi Ghee (Amul)', qty: '0.02', unit: 'kg', cost: 12 },
      { id: 'RM-106', name: 'Onions (Nashik Red)', qty: '0.10', unit: 'kg', cost: 4 },
      { id: 'RM-107', name: 'Kashmiri Saffron & Spices', qty: '1', unit: 'portion', cost: 8 },
    ],
    calculatedCost: 165,
    instructions: 'Slow cook mutton until tender, blend with mashed wheat and lentils, simmer with spices.',
  },
];

export const DEFAULT_UTENSILS = [
  { id: 'UTN-01', name: 'Heavy Brass Dum Handi (Large 10kg)', category: 'Cookware', totalQty: 12, inUse: 8, inCleaning: 4, unitCost: 4200, condition: 'Excellent' },
  { id: 'UTN-02', name: 'Heavy Brass Dum Handi (Medium 5kg)', category: 'Cookware', totalQty: 18, inUse: 14, inCleaning: 4, unitCost: 2800, condition: 'Good' },
  { id: 'UTN-03', name: 'Stainless Steel Royal Bohra Thaal (Big)', category: 'Service Ware', totalQty: 25, inUse: 10, inCleaning: 15, unitCost: 1800, condition: 'Good' },
  { id: 'UTN-04', name: 'Tandoor Skewers (Long Stainless Steel)', category: 'Tandoor Tools', totalQty: 40, inUse: 25, inCleaning: 15, unitCost: 350, condition: 'Good' },
];

export const DEFAULT_COMBOS = [
  {
    id: 'CMB-01',
    name: 'The Grand Bohra Royal Thaal (8 Pax)',
    serves: '7-8 Guests',
    price: 6800,
    image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop&q=80',
    description: 'Traditional Royal Bohra feast: Salt tasting, Seekh Kebab, Mutton Khichda, Chicken Handi Biryani, 10 Butter Naans, Malai Gulab Jamun, and Paan.',
    contents: ['Mutton Seekh Kebab (8 Pcs)', 'Mutton Bohra Khichda Handi', 'Chicken Dum Biryani Handi', 'Butter Naan (10 Pcs)', 'Gulab Jamun (8 Pcs)'],
    isAvailable: true,
  },
  {
    id: 'CMB-02',
    name: 'Bharmal Signature Mini Thaal (2-3 Pax)',
    serves: '2-3 Guests',
    price: 2450,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    description: 'Ideal couple or small family feast: Seekh Kebab, choice of Biryani or Khichda, Dal Makhani, 4 Naans, and Gulab Jamun.',
    contents: ['Mutton Seekh Kebab (4 pcs)', 'Chicken Dum Biryani (1 Handi)', 'Dal Makhani Bukhara', 'Butter Naan (4 pcs)', 'Gulab Jamun (2 pcs)'],
    isAvailable: true,
  },
];

export const DEFAULT_MODIFIERS = [
  {
    id: 'MOD-01',
    name: 'Spice Level Selection',
    type: 'single',
    options: [
      { name: 'Mild / Bohra Style (Sweet Spiced)', price: 0 },
      { name: 'Medium Regular', price: 0 },
      { name: 'Spicy Angara', price: 0 },
    ],
  },
  {
    id: 'MOD-02',
    name: 'Biryani Accompaniments',
    type: 'multiple',
    options: [
      { name: 'Extra Mirchi Ka Salan', price: 60 },
      { name: 'Cucumber Mint Raita', price: 50 },
      { name: 'Fried Caramelized Onions (Birista)', price: 40 },
    ],
  },
  {
    id: 'MOD-03',
    name: 'Bread Glaze & Butter',
    type: 'single',
    options: [
      { name: 'Plain (No Butter)', price: 0 },
      { name: 'Amul Butter Glaze', price: 15 },
      { name: 'Garlic Coriander Butter', price: 25 },
    ],
  },
];

export const DEFAULT_STAFF = [
  { id: 'EMP-01', name: 'Mustafa Bharmal', role: 'Owner', phone: '+91 98200 11223', salary: 100000, status: 'active', shift: 'Full Day', joinedDate: '2024-01-15' },
  { id: 'EMP-02', name: 'Chef Aslam Qureshi', role: 'Chef', phone: '+91 98199 44556', salary: 55000, status: 'active', shift: 'Morning + Dinner', joinedDate: '2024-02-01' },
  { id: 'EMP-03', name: 'Rashid Khan', role: 'Kitchen Staff', phone: '+91 98333 77889', salary: 32000, status: 'active', shift: 'Dinner', joinedDate: '2024-03-10' },
  { id: 'EMP-04', name: 'Captain Shabbir', role: 'Waiter', phone: '+91 97690 12345', salary: 26000, status: 'active', shift: 'Full Day', joinedDate: '2024-04-01' },
  { id: 'EMP-05', name: 'Salman Mansoori', role: 'Cashier', phone: '+91 98670 99887', salary: 24000, status: 'active', shift: 'Morning', joinedDate: '2024-05-15' },
];

export const DEFAULT_BRANCHES = [
  { id: 'BRN-01', name: 'Bhendi Bazaar (Flagship Restaurant)', code: 'MUM-BB-01', type: 'Dine-in & Delivery', phone: '+91 98200 12345', address: 'Shop 4 & 5, Saifee Jubilee St, Bhendi Bazaar, Mumbai 400003', tablesCount: 12, isPrimary: true, status: 'active' },
  { id: 'BRN-02', name: 'Bandra West Cloud Kitchen', code: 'MUM-BW-02', type: 'Delivery & Takeaway Only', phone: '+91 98200 99881', address: 'Hill Road, Near Mehboob Studio, Bandra West, Mumbai 400050', tablesCount: 0, isPrimary: false, status: 'active' },
];

export const DEFAULT_USERS = [
  { id: 'USR-01', name: 'Mustafa Bharmal', email: 'owner@thebharmalskitchen.com', role: 'Owner', status: 'active', lastLogin: 'Just now' },
  { id: 'USR-02', name: 'Aslam Qureshi', email: 'chef@thebharmalskitchen.com', role: 'Chef', status: 'active', lastLogin: '1 hour ago' },
  { id: 'USR-03', name: 'Salman Mansoori', email: 'cashier@thebharmalskitchen.com', role: 'Cashier', status: 'active', lastLogin: 'Just now' },
  { id: 'USR-04', name: 'Captain Shabbir', email: 'waiter@thebharmalskitchen.com', role: 'Waiter', status: 'active', lastLogin: '3 hours ago' },
];

export const DEFAULT_TABLES = [
  { id: 'T-01', name: 'Table 1', section: 'Main Dining', capacity: 4, status: 'available', assignedCaptain: 'Captain Shabbir' },
  { id: 'T-02', name: 'Table 2', section: 'Main Dining', capacity: 2, status: 'available', assignedCaptain: 'Captain Shabbir' },
  { id: 'T-03', name: 'Table 3', section: 'Main Dining', capacity: 6, status: 'reserved', assignedCaptain: 'Captain Taher' },
  { id: 'T-04', name: 'Table 4', section: 'Main Dining', capacity: 4, status: 'occupied', assignedCaptain: 'Captain Shabbir' },
  { id: 'T-05', name: 'Table 5', section: 'Main Dining', capacity: 4, status: 'available', assignedCaptain: 'Captain Taher' },
  { id: 'T-06', name: 'Table 6', section: 'Family Section', capacity: 8, status: 'occupied', assignedCaptain: 'Captain Mufaddal' },
  { id: 'T-07', name: 'Table 7', section: 'Family Section', capacity: 6, status: 'billed', assignedCaptain: 'Captain Mufaddal' },
  { id: 'T-08', name: 'Table 8', section: 'Family Section', capacity: 4, status: 'cleaning', assignedCaptain: 'Captain Mufaddal' },
  { id: 'T-09', name: 'Table 9', section: 'Outdoor Terrace', capacity: 4, status: 'occupied', assignedCaptain: 'Waiter Ali' },
  { id: 'T-10', name: 'Table 10', section: 'Outdoor Terrace', capacity: 2, status: 'available', assignedCaptain: 'Waiter Ali' },
  { id: 'T-11', name: 'Table 11', section: 'Outdoor Terrace', capacity: 2, status: 'available', assignedCaptain: 'Waiter Ali' },
  { id: 'T-12', name: 'Table 12', section: 'Outdoor Terrace', capacity: 6, status: 'reserved', assignedCaptain: 'Waiter Ali' },
];

export const DEFAULT_SUPPLIERS = [
  { id: 'SUP-01', name: 'Al-Madina Poultry Farm', contactPerson: 'Haji Iqbal', phone: '+91 98201 55667', category: 'Meat & Poultry', gstin: '27AAACA1234F1Z5', paymentTerms: 'Net 7 Days', address: 'Kurla West Meat Market, Mumbai' },
  { id: 'SUP-02', name: 'Deccan Halal Mutton Traders', contactPerson: 'Rizwan Qureshi', phone: '+91 98190 22334', category: 'Meat & Poultry', gstin: '27AABCR9876E1Z1', paymentTerms: 'Cash / COD', address: 'Deonar Abattoir Road, Mumbai' },
  { id: 'SUP-03', name: 'Bharmal Wholesale Grocery', contactPerson: 'Mufaddal Bhai', phone: '+91 98200 99881', category: 'Grains & Spices', gstin: '27AAAFB4321D1ZX', paymentTerms: 'Net 15 Days', address: 'Null Bazaar, Mumbai' },
  { id: 'SUP-04', name: 'Amul Dairy Authorized Distributors', contactPerson: 'Sunil Patil', phone: '+91 98330 44556', category: 'Dairy & Fats', gstin: '27AAACA5555M1Z2', paymentTerms: 'Net 7 Days', address: 'Dadar Commercial Yard, Mumbai' },
  { id: 'SUP-05', name: 'Saifee Kitchen Utensil Hub', contactPerson: 'Abbas Bhai', phone: '+91 98202 33445', category: 'Utensils & Equipment', gstin: '27AAACS9911A1ZZ', paymentTerms: 'Immediate', address: 'Lohar Chawl, Mumbai' },
];

export const DEFAULT_SUPPLY_CATEGORIES = [
  'Meat & Poultry',
  'Grains & Spices',
  'Dairy & Fats',
  'Vegetables & Fresh Produce',
  'Utensils & Equipment',
  'Packaging & Disposables',
];

export const DEFAULT_KITCHEN_STATIONS = [
  { id: 'STN-01', name: 'Tandoor Section', desc: 'Charcoal clay tandoors for kebabs, tikkas, and fresh naans', printer: 'PRN-02' },
  { id: 'STN-02', name: 'Curry / Biryani Handi', desc: 'Slow simmer dum handi, khichda, dal, and salan cauldrons', printer: 'PRN-03' },
  { id: 'STN-03', name: 'Desserts & Beverages', desc: 'Warm gulab jamuns, rabdi, falooda, masala chai', printer: 'PRN-04' },
  { id: 'STN-04', name: 'Cold / Salad Counter', desc: 'Raita, mint dips, green salads, sodana sets', printer: null },
];

export const DEFAULT_PURCHASE_BILLS = [
  {
    id: 'BILL-501',
    invoiceNumber: 'INV-ALM-889',
    supplier: 'Al-Madina Poultry Farm',
    billDate: '2026-09-24',
    dueDate: '2026-10-01',
    items: [
      { type: 'raw_material', itemId: 'RM-101', name: 'Fresh Chicken (Curry Cut)', qty: 40, unit: 'kg', unitCost: 180, total: 7200 },
    ],
    taxableAmount: 6857,
    gstAmount: 343,
    totalAmount: 7200,
    paymentStatus: 'pending',
  },
  {
    id: 'BILL-500',
    invoiceNumber: 'BWG/2026/412',
    supplier: 'Bharmal Wholesale Grocery',
    billDate: '2026-09-22',
    dueDate: '2026-10-07',
    items: [
      { type: 'raw_material', itemId: 'RM-103', name: 'Daawat Basmati Rice (XXL)', qty: 100, unit: 'kg', unitCost: 110, total: 11000 },
      { type: 'raw_material', itemId: 'RM-109', name: 'Black Urad Dal (Bukhara)', qty: 30, unit: 'kg', unitCost: 130, total: 3900 },
    ],
    taxableAmount: 14190,
    gstAmount: 710,
    totalAmount: 14900,
    paymentStatus: 'paid',
  },
];

export const DEFAULT_ORDERS = [
  {
    id: 'TBK-1042',
    orderNumber: 1042,
    orderType: 'dine_in',
    table: 'T-04',
    customer: 'Farhan Merchant',
    captain: 'Captain Shabbir',
    deliveryPartner: null,
    items: [
      { id: 'ITEM-02', name: 'Chicken Biryani (Dum Handi)', qty: 2, price: 340 },
      { id: 'ITEM-07', name: 'Gulab Jamun (Warm, 2 Pcs)', qty: 2, price: 80 },
    ],
    total: 840,
    status: 'cooking',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    elapsedMinutes: 15,
    paymentStatus: 'pending',
  },
  {
    id: 'TBK-1043',
    orderNumber: 1043,
    orderType: 'takeaway',
    table: null,
    customer: 'Zainab Kapasi',
    captain: null,
    deliveryPartner: null,
    items: [
      { id: 'ITEM-03', name: 'Mutton Seekh Kebab (4 Pcs)', qty: 1, price: 380 },
      { id: 'ITEM-05', name: 'Butter Naan', qty: 3, price: 45 },
      { id: 'ITEM-06', name: 'Dal Makhani Bukhara', qty: 1, price: 260 },
    ],
    total: 775,
    status: 'received',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    elapsedMinutes: 5,
    paymentStatus: 'paid',
  },
];

export const DEFAULT_CUSTOMERS = [
  {
    id: 'CUST-101',
    name: 'Farhan Merchant',
    phone: '+91 98201 12345',
    email: 'farhan.merchant@example.com',
    tier: 'Platinum',
    visits: 24,
    totalSpent: 38400,
    loyaltyPoints: 1920,
    favoriteDish: 'Chicken Biryani (Dum)',
    lastVisit: '2026-09-25',
    preferences: 'Bohra Halal, Less Spicy',
    nfc_uid: '04:5A:8B:E2:19:64:80',
    wallet_balance: 1250.0,
    wallet_transactions: [
      { id: 'WTX-01', type: 'recharge', amount: 1000, bonus: 100, totalCredit: 1100, timestamp: '2026-09-20T14:30:00Z', cashier: 'Salman M.' },
      { id: 'WTX-02', type: 'debit', amount: 840, timestamp: '2026-09-22T20:15:00Z', orderId: 'TBK-1035' },
      { id: 'WTX-03', type: 'recharge', amount: 900, bonus: 90, totalCredit: 990, timestamp: '2026-09-25T11:20:00Z', cashier: 'Salman M.' },
    ],
  },
  {
    id: 'CUST-102',
    name: 'Zainab Kapasi',
    phone: '+91 98192 33445',
    email: 'zainab.k@example.com',
    tier: 'Gold',
    visits: 14,
    totalSpent: 19250,
    loyaltyPoints: 960,
    favoriteDish: 'Mutton Seekh Kebab',
    lastVisit: '2026-09-24',
    preferences: 'Outdoor Seating Preferred',
    nfc_uid: '04:1C:3F:A9:72:48:80',
    wallet_balance: 620.0,
    wallet_transactions: [
      { id: 'WTX-04', type: 'recharge', amount: 600, bonus: 60, totalCredit: 660, timestamp: '2026-09-24T18:00:00Z', cashier: 'Salman M.' },
    ],
  },
  {
    id: 'CUST-103',
    name: 'Dr. Hussain Vasi',
    phone: '+91 99204 88712',
    email: 'dr.vasi@example.com',
    tier: 'Platinum',
    visits: 31,
    totalSpent: 52100,
    loyaltyPoints: 2605,
    favoriteDish: 'Bohra Style Khichda',
    lastVisit: '2026-09-25',
    preferences: 'Table 4 Reserved Regular',
    nfc_uid: '',
    wallet_balance: 0.0,
    wallet_transactions: [],
  },
  {
    id: 'CUST-104',
    name: 'Fatema Lokhandwala',
    phone: '+91 98765 43210',
    email: 'fatema.l@example.com',
    tier: 'Silver',
    visits: 6,
    totalSpent: 7800,
    loyaltyPoints: 390,
    favoriteDish: 'Dal Makhani Special',
    lastVisit: '2026-09-21',
    preferences: 'Vegetarian',
    nfc_uid: '',
    wallet_balance: 0.0,
    wallet_transactions: [],
  },
];

export const DEFAULT_RESERVATIONS = [
  {
    id: 'RES-301',
    guestName: 'Burhanuddin Saifee',
    phone: '+91 98201 12345',
    guests: 6,
    date: '2026-09-25',
    time: '08:30 PM',
    tableAssigned: 'T-03',
    status: 'confirmed',
    notes: 'Anniversary dinner. Requested quiet corner booth.',
  },
  {
    id: 'RES-302',
    guestName: 'Zainab Vasi',
    phone: '+91 98192 33445',
    guests: 4,
    date: '2026-09-25',
    time: '09:00 PM',
    tableAssigned: 'T-12',
    status: 'confirmed',
    notes: 'Prefers outdoor terrace seating.',
  },
  {
    id: 'RES-303',
    guestName: 'Shabbir Shakir',
    phone: '+91 98760 99881',
    guests: 8,
    date: '2026-09-25',
    time: '09:30 PM',
    tableAssigned: 'T-06',
    status: 'waiting',
    notes: 'Family gathering with kids.',
  },
  {
    id: 'RES-304',
    guestName: 'Mufaddal Contractor',
    phone: '+91 99300 45678',
    guests: 2,
    date: '2026-09-25',
    time: '07:30 PM',
    tableAssigned: 'T-02',
    status: 'seated',
    notes: 'Arrived on time.',
  },
];

export const DEFAULT_WAITLIST = [
  { id: 'WL-01', name: 'Zohra Merchant', phone: '+91 98200 44551', guests: 4, quotedMinutes: 15, elapsedMinutes: 8, status: 'waiting' },
  { id: 'WL-02', name: 'Moiz Badami', phone: '+91 98199 11223', guests: 6, quotedMinutes: 25, elapsedMinutes: 14, status: 'waiting' },
  { id: 'WL-03', name: 'Alifiya Hakim', phone: '+91 97690 88776', guests: 2, quotedMinutes: 10, elapsedMinutes: 12, status: 'notified' },
];

export const DEFAULT_LEAVES = [
  { id: 'LEV-101', staffId: 'EMP-05', staffName: 'Salman Mansoori', role: 'Cashier', fromDate: '2026-09-25', toDate: '2026-09-26', days: 2, isPaid: true, type: 'Casual Leave', reason: 'Family Function in Surat', status: 'approved' },
  { id: 'LEV-102', staffId: 'EMP-03', staffName: 'Rashid Khan', role: 'Kitchen Staff', fromDate: '2026-09-28', toDate: '2026-09-28', days: 1, isPaid: false, type: 'Medical / Sick', reason: 'Doctor Appointment', status: 'pending' },
];

export const DEFAULT_ADVANCES = [
  { id: 'ADV-301', staffId: 'EMP-03', staffName: 'Rashid Khan', role: 'Kitchen Staff', amount: 5000, date: '2026-09-10', reason: 'House Rent Advance', recoveryMonth: 'September 2026', status: 'approved' },
  { id: 'ADV-302', staffId: 'EMP-04', staffName: 'Captain Shabbir', role: 'Waiter', amount: 3000, date: '2026-09-15', reason: 'Bike Tyre Replacement', recoveryMonth: 'September 2026', status: 'approved' },
];

export const DEFAULT_EXPENSES = [
  { id: 'EXP-401', date: '2026-09-25', category: 'Kitchen Supplies', title: 'Commercial LPG Cylinder (2x 19kg)', amount: 3750, paymentMode: 'Cash Drawer', recordedBy: 'Mustafa B.', receiptUrl: null },
  { id: 'EXP-402', date: '2026-09-25', category: 'Vegetables & Perishables', title: 'Daily APMC Market Purchase', amount: 2450, paymentMode: 'UPI (GPay)', recordedBy: 'Chef Aslam', receiptUrl: null },
  { id: 'EXP-403', date: '2026-09-24', category: 'Maintenance', title: 'Tandoor Blower Motor Servicing', amount: 1200, paymentMode: 'Cash Drawer', recordedBy: 'Mustafa B.', receiptUrl: null },
  { id: 'EXP-404', date: '2026-09-23', category: 'Packaging', title: 'Biryani Handi Containers & Paper Bags (500 sets)', amount: 6800, paymentMode: 'Bank Transfer', recordedBy: 'Admin', receiptUrl: null },
  { id: 'EXP-405', date: '2026-09-20', category: 'Utilities', title: 'MSEDCL Electricity Commercial Bill', amount: 14500, paymentMode: 'Bank Transfer', recordedBy: 'Admin', receiptUrl: null },
];

export const DEFAULT_CASH_TRANSACTIONS = [
  { id: 'CD-101', type: 'in', reason: 'Opening Shift Float', amount: 5000, cashier: 'Mustafa B.', time: '11:00 AM', timestamp: new Date().toISOString() },
  { id: 'CD-102', type: 'in', reason: 'Cash Order #TBK-1040', amount: 620, cashier: 'Mustafa B.', time: '01:45 PM', timestamp: new Date().toISOString() },
  { id: 'CD-103', type: 'out', reason: 'Daily APMC Ice Delivery', amount: 350, cashier: 'Mustafa B.', time: '02:30 PM', timestamp: new Date().toISOString() },
  { id: 'CD-104', type: 'out', reason: 'LPG Commercial Cylinder Cash Payment', amount: 3750, cashier: 'Mustafa B.', time: '04:15 PM', timestamp: new Date().toISOString() },
  { id: 'CD-105', type: 'in', reason: 'Cash Order #TBK-1045', amount: 540, cashier: 'Salman M.', time: '07:20 PM', timestamp: new Date().toISOString() },
];

export const DEFAULT_RECEIPT_TEMPLATE = {
  restaurantName: 'THE BHARMALS KITCHEN',
  tagline: 'Authentic Bohra Cuisine & Mughlai Handis',
  address: 'Shop 4 & 5, Saifee Jubilee St, Bhendi Bazaar, Mumbai 400003',
  phone: '+91 98200 12345',
  gstin: '27AABCT8521M1ZX',
  fssai: '11521018000452',
  logoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=160&auto=format&fit=crop&q=80',
  qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=bharmalskitchen@okaxis&pn=TheBharmalsKitchen',
  fontFamily: 'Courier New',
  paperWidth: '80mm',
  footerMessage: 'Shukran for dining with us! Visit again soon.',
  showLogo: true,
  showQRCode: true,
  showGSTIN: true,
  showFSSAI: true,
  autoCut: true,
};

export const DEFAULT_PURCHASE_ORDERS = [
  { id: 'PO-701', date: '2026-09-25', supplier: 'Al-Madina Poultry Farm', expectedDate: '2026-09-26', totalAmount: 7200, itemsCount: 2, status: 'sent' },
  { id: 'PO-700', date: '2026-09-24', supplier: 'Bharmal Wholesale Grocery', expectedDate: '2026-09-25', totalAmount: 18500, itemsCount: 4, status: 'received' },
  { id: 'PO-699', date: '2026-09-22', supplier: 'Amul Dairy Distributors', expectedDate: '2026-09-23', totalAmount: 6400, itemsCount: 2, status: 'received' },
];

export const DEFAULT_AUDIT_LOGS = [
  { id: 'LOG-8801', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'Mustafa Bharmal (Owner)', action: 'Cash Drawer Petty Payout', details: 'Withdrew ₹3,750 for LPG Cylinder payment', ip: '192.168.1.10 (POS-1)' },
  { id: 'LOG-8800', timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'Chef Aslam Qureshi', action: 'Stock Level Adjustment', details: 'Added 20kg Fresh Chicken to Inventory', ip: '192.168.1.44 (KDS-Main)' },
  { id: 'LOG-8799', timestamp: new Date(Date.now() - 14400000).toISOString(), user: 'Salman Mansoori (Cashier)', action: 'Discount Applied', details: 'Applied 10% Bohra Family Discount on #TBK-1040', ip: '192.168.1.10 (POS-1)' },
  { id: 'LOG-8798', timestamp: new Date(Date.now() - 21600000).toISOString(), user: 'Mustafa Bharmal (Owner)', action: 'Menu Item 86 Toggle', details: 'Toggled Bohra Khichda to In-Stock', ip: '192.168.1.10 (POS-1)' },
];

export const DEFAULT_PRINT_ROUTING = [
  { category: 'Starters & Tandoor', primaryPrinter: 'Tandoor Station KOT Printer', backupPrinter: 'Cashier Main POS Printer', copies: 1, printOnKOT: true },
  { category: 'Mains & Biryanis', primaryPrinter: 'Handi & Biryani KOT Printer', backupPrinter: 'Cashier Main POS Printer', copies: 1, printOnKOT: true },
  { category: 'Breads & Accompaniments', primaryPrinter: 'Tandoor Station KOT Printer', backupPrinter: 'Cashier Main POS Printer', copies: 1, printOnKOT: true },
  { category: 'Desserts & Beverages', primaryPrinter: 'Beverages & Dessert Bar Printer', backupPrinter: 'Cashier Main POS Printer', copies: 1, printOnKOT: true },
  { category: 'Bohra Special Thaal', primaryPrinter: 'Handi & Biryani KOT Printer', backupPrinter: 'Cashier Main POS Printer', copies: 1, printOnKOT: true },
  { category: 'Customer Bills (All Categories)', primaryPrinter: 'Cashier Main POS Printer', backupPrinter: 'Tandoor Station KOT Printer', copies: 1, printOnKOT: false },
];

export const DEFAULT_PRINT_QUEUE = [
  { id: 'JOB-904', type: 'Tax Invoice (Bill)', document: 'Order #TBK-1044', printer: 'Cashier Main POS Printer', status: 'completed', time: '1 min ago', attempts: 1 },
  { id: 'JOB-903', type: 'KOT Slip', document: 'KOT #804 (T-01)', printer: 'Handi & Biryani KOT Printer', status: 'completed', time: '4 mins ago', attempts: 1 },
  { id: 'JOB-902', type: 'KOT Slip', document: 'KOT #803 (T-09)', printer: 'Tandoor Station KOT Printer', status: 'completed', time: '8 mins ago', attempts: 1 },
  { id: 'JOB-901', type: 'KOT Slip', document: 'KOT #802 (Takeaway)', printer: 'Beverages & Dessert Bar Printer', status: 'failed', time: '12 mins ago', attempts: 3, error: 'Bluetooth socket timeout' },
];

export const DEFAULT_PRINTERS = [
  { id: 'PRN-01', name: 'Cashier Main POS Printer', brand: 'Epson', model: 'TM-T82III', connectionType: 'WiFi', ipAddress: '192.168.1.101', port: '9100', paperWidth: '80mm', assignedStation: 'Front Counter', isDefault: true, autoCut: true, cashDrawer: true, status: 'online' },
  { id: 'PRN-02', name: 'Tandoor Station KOT Printer', brand: 'Xprinter', model: 'XP-Q800', connectionType: 'WiFi', ipAddress: '192.168.1.102', port: '9100', paperWidth: '80mm', assignedStation: 'Kitchen - Tandoor', isDefault: false, autoCut: true, cashDrawer: false, status: 'online' },
  { id: 'PRN-03', name: 'Handi & Biryani KOT Printer', brand: 'Bixolon', model: 'SRP-350plus', connectionType: 'WiFi', ipAddress: '192.168.1.103', port: '9100', paperWidth: '80mm', assignedStation: 'Kitchen - Main', isDefault: false, autoCut: true, cashDrawer: false, status: 'online' },
  { id: 'PRN-04', name: 'Beverages & Dessert Bar Printer', brand: 'Custom', model: 'POS-80', connectionType: 'Bluetooth', macAddress: '00:11:22:33:AA:BB', paperWidth: '58mm', assignedStation: 'Bar', isDefault: false, autoCut: false, cashDrawer: false, status: 'online' },
];

export const DEFAULT_KOTS = [
  { id: 'KOT-804', orderId: 'TBK-1046', table: 'T-01', station: 'Desserts & Beverages', items: 'Gulab Jamun (2), Masala Chai (2)', time: '10 mins ago', status: 'completed', createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'KOT-803', orderId: 'TBK-1045', table: 'T-09', station: 'Tandoor', items: 'Paneer Tikka Angara (1), Garlic Naan (2)', time: '18 mins ago', status: 'active', createdAt: new Date(Date.now() - 1080000).toISOString() },
  { id: 'KOT-802', orderId: 'TBK-1043', table: 'Takeaway', station: 'Tandoor', items: 'Mutton Seekh Kebab (1), Butter Naan (3)', time: '22 mins ago', status: 'completed', createdAt: new Date(Date.now() - 1320000).toISOString() },
  { id: 'KOT-801', orderId: 'TBK-1042', table: 'T-04', station: 'Curry / Biryani', items: 'Chicken Biryani (2), Mirchi Ka Salan (1)', time: '30 mins ago', status: 'completed', createdAt: new Date(Date.now() - 1800000).toISOString() },
];

export const DEFAULT_WASTAGE = [
  { id: 'WST-201', date: '2026-09-25', material: 'Onions (Nashik Red)', qty: 4, unit: 'kg', cost: 140, reason: 'Spoiled / Soft in Storage', loggedBy: 'Chef Aslam' },
  { id: 'WST-200', date: '2026-09-24', material: 'Fresh Malai Paneer', qty: 0.5, unit: 'kg', cost: 160, reason: 'Burnt in Tandoor Skewer Test', loggedBy: 'Rashid Khan' },
  { id: 'WST-199', date: '2026-09-22', material: 'Prepared Dal Makhani', qty: 2, unit: 'portions', cost: 160, reason: 'End of Day Unsold Surplus', loggedBy: 'Mustafa B.' },
];

export const DEFAULT_PROMOTIONS = [
  { id: 'PROMO-01', code: 'BOHRAFAMILY10', title: 'Community Family Dining Discount', discountType: 'percentage', value: 10, minBill: 1500, maxDiscount: 500, status: 'active', uses: 84 },
  { id: 'PROMO-02', code: 'FLAT150OFF', title: 'Weekend Biryani Special Offer', discountType: 'flat', value: 150, minBill: 1000, maxDiscount: 150, status: 'active', uses: 46 },
  { id: 'PROMO-03', code: 'STAFFDISCOUNT20', title: 'Employee & Internal Staff Perk', discountType: 'percentage', value: 20, minBill: 0, maxDiscount: 1000, status: 'active', uses: 22 },
];

export const DEFAULT_LOYALTY_TIERS = [
  {
    tier: 'Platinum Bohra Circle',
    minSpend: 30000,
    pointsMultiplier: '1.5x (₹100 = 15 Pts)',
    multiplierValue: 1.5,
    perks: 'Complimentary Dessert on every visit, priority table reservation, chef special tastings, 15% smart card bonus.',
  },
  {
    tier: 'Gold Gourmet',
    minSpend: 15000,
    pointsMultiplier: '1.2x (₹100 = 12 Pts)',
    multiplierValue: 1.2,
    perks: '10% birthday discount, priority seating during rush hours, 12% smart card bonus.',
  },
  {
    tier: 'Silver Diner',
    minSpend: 0,
    pointsMultiplier: '1.0x (₹100 = 10 Pts)',
    multiplierValue: 1.0,
    perks: 'Redeemable reward points on dine-in billing, standard 10% prepaid card recharge bonus.',
  },
];

// ─── Storage & Firestore Synchronization Engine ──────────────

function storageKey(key) {
  return isInventoryOnly && !isDemoMode
    ? `tbk:${import.meta.env.VITE_FIREBASE_PROJECT_ID}:${auth?.currentUser?.uid || 'anonymous'}:${key}`
    : key;
}

function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Local reading error (${key}):`, e);
  }
  const initialValue = !isDemoMode && Array.isArray(defaultVal) ? [] : defaultVal;
  if (initialValue !== undefined) localStorage.setItem(storageKey(key), JSON.stringify(initialValue));
  return initialValue;
}

function setStored(key, val) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(val));
  } catch (e) {
    console.error(`Local save error (${key}):`, e);
  }
}

/**
 * Direct Push to Firestore
 */
async function syncDocToFirestore(colName, docId, data) {
  if (!db) return;
  try {
    const docRef = doc(db, colName, String(docId));
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    console.info(`🔥 Firestore Synced: [${colName}/${docId}]`);
  } catch (err) {
    console.warn(`Firestore sync note (${colName}/${docId}):`, err.message);
  }
}

/**
 * Direct Delete from Firestore
 */
async function deleteDocFromFirestore(colName, docId) {
  if (!db) return;
  try {
    const docRef = doc(db, colName, String(docId));
    await deleteDoc(docRef);
    console.info(`🔥 Firestore Deleted: [${colName}/${docId}]`);
  } catch (err) {
    console.warn(`Firestore delete note (${colName}/${docId}):`, err.message);
  }
}

// ─── Categories API ──────────────────────────────────────────
export function getCategories() {
  return getStored('tbk_categories', DEFAULT_CATEGORIES);
}

export function saveCategory(category) {
  const list = getCategories();
  let updated;
  let savedCat;
  if (category.id && list.some((c) => c.id === category.id)) {
    updated = list.map((c) => {
      if (c.id === category.id) {
        savedCat = { ...c, ...category };
        return savedCat;
      }
      return c;
    });
  } else {
    const id = category.id || `CAT-${String(list.length + 1).padStart(2, '0')}`;
    savedCat = {
      ...category,
      id,
      sortOrder: category.sortOrder || list.length + 1,
      isActive: category.isActive !== undefined ? category.isActive : true,
    };
    updated = [...list, savedCat];
  }
  setStored('tbk_categories', updated);
  syncDocToFirestore('categories', savedCat.id, savedCat);
  return updated;
}

export function deleteCategory(id) {
  const list = getCategories();
  const updated = list.filter((c) => c.id !== id);
  setStored('tbk_categories', updated);
  deleteDocFromFirestore('categories', id);
  return updated;
}

// ─── Menu Items API ──────────────────────────────────────────
export function getMenuItems() {
  return getStored('tbk_menu_items', DEFAULT_MENU_ITEMS);
}

export function saveMenuItem(item) {
  const list = getMenuItems();
  let updated;
  let savedItem;
  if (item.id && list.some((i) => i.id === item.id)) {
    updated = list.map((i) => {
      if (i.id === item.id) {
        savedItem = {
          ...i,
          ...item,
          price: Number(item.price) || 0,
          costPrice: Number(item.costPrice) || 0,
        };
        return savedItem;
      }
      return i;
    });
  } else {
    const id = item.id || `ITEM-${String(list.length + 1).padStart(2, '0')}`;
    savedItem = {
      ...item,
      id,
      price: Number(item.price) || 0,
      costPrice: Number(item.costPrice) || 0,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
      category: item.category || '', // Can be empty until categorized!
    };
    updated = [savedItem, ...list];
  }
  setStored('tbk_menu_items', updated);
  syncDocToFirestore('menu_items', savedItem.id, savedItem);
  return updated;
}

export function deleteMenuItem(id) {
  const list = getMenuItems();
  const updated = list.filter((i) => i.id !== id);
  setStored('tbk_menu_items', updated);
  deleteDocFromFirestore('menu_items', id);
  return updated;
}

export function toggleMenuItemStock(id) {
  const list = getMenuItems();
  let affected;
  const updated = list.map((i) => {
    if (i.id === id) {
      affected = { ...i, isAvailable: !i.isAvailable };
      return affected;
    }
    return i;
  });
  setStored('tbk_menu_items', updated);
  if (affected) syncDocToFirestore('menu_items', affected.id, affected);
  return updated;
}

// ─── Recipes & BOM API ───────────────────────────────────────
export function getRecipes() {
  return getStored('tbk_recipes', DEFAULT_RECIPES);
}

export function saveRecipe(recipe) {
  const list = getRecipes();
  const batchCost = (recipe.ingredients || []).reduce(
    (sum, ing) => sum + (Number(ing.cost) || 0),
    0
  );
  const calculatedCost = batchCost / (Number(recipe.yieldServings) || 1);

  const payload = {
    ...recipe,
    calculatedCost,
    yieldServings: Number(recipe.yieldServings) || 1,
    sellingPrice: Number(recipe.sellingPrice) || 0,
  };

  let updated;
  let savedRecipe;
  if (recipe.id && list.some((r) => r.id === recipe.id)) {
    updated = list.map((r) => {
      if (r.id === recipe.id) {
        savedRecipe = { ...r, ...payload };
        return savedRecipe;
      }
      return r;
    });
  } else {
    const id = recipe.id || inventoryId('RCP');
    savedRecipe = { ...payload, id };
    updated = [savedRecipe, ...list];
  }
  setStored('tbk_recipes', updated);
  syncDocToFirestore('recipes', savedRecipe.id, savedRecipe);

  // Requirement: "when i add recepie the items directly go to menu items and display until the item dosent have category after when i select category then dish appears in POS"
  const menuItems = getMenuItems();
  const existingItem = menuItems.find(
    (m) => m.id === savedRecipe.dishId || m.name.toLowerCase() === savedRecipe.dishName.toLowerCase()
  );

  if (!existingItem) {
    // Automatically create menu item with uncategorized state
    const newItem = {
      id: savedRecipe.dishId || inventoryId('ITEM'),
      name: savedRecipe.dishName,
      category: '', // No category yet!
      categoryId: null,
      price: savedRecipe.sellingPrice || calculatedCost * 2,
      costPrice: calculatedCost,
      type: 'non-veg',
      station: 'Curry / Biryani',
      prepTime: 15,
      isAvailable: true,
      description: savedRecipe.instructions || 'Recipe formulation ready. Assign category to show in POS.',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    };
    saveMenuItem(newItem);
  } else {
    // Update food cost on existing item
    saveMenuItem({ ...existingItem, costPrice: calculatedCost });
  }

  return updated;
}

export function deleteRecipe(id) {
  const list = getRecipes();
  const updated = list.filter((r) => r.id !== id);
  setStored('tbk_recipes', updated);
  deleteDocFromFirestore('recipes', id);
  return updated;
}

// ─── Raw Materials Inventory API ─────────────────────────────
export function getRawMaterials() {
  return getStored('tbk_raw_materials', DEFAULT_RAW_MATERIALS);
}

export function saveRawMaterial(material) {
  const list = getRawMaterials();
  let updated;
  let savedMat;
  if (material.id && list.some((m) => m.id === material.id)) {
    updated = list.map((m) => {
      if (m.id === material.id) {
        savedMat = {
          ...m,
          ...material,
          currentStock: Number(material.currentStock) || 0,
          unitCost: Number(material.unitCost) || 0,
        };
        return savedMat;
      }
      return m;
    });
  } else {
    const id = material.id || inventoryId('RM');
    savedMat = {
      ...material,
      id,
      currentStock: Number(material.currentStock) || 0,
      reorderLevel: Number(material.reorderLevel ?? 5),
      unitCost: Number(material.unitCost) || 0,
    };
    updated = [...list, savedMat];
  }
  setStored('tbk_raw_materials', updated);
  syncDocToFirestore('raw_materials', savedMat.id, savedMat);
  return updated;
}

export function deleteRawMaterial(id) {
  const list = getRawMaterials();
  const target = list.find((material) => material.id === id);
  if (!target) return list;
  if (Number(target.currentStock) > 0) throw new Error('Reconcile this material to zero stock before deleting it.');
  if (getRecipes().some((recipe) => recipe.ingredients?.some((ingredient) => ingredient.id === id || ingredient.name?.toLowerCase() === target.name.toLowerCase()))) {
    throw new Error('Remove this material from linked recipes before deleting it.');
  }
  const updated = list.filter((m) => m.id !== id);
  setStored('tbk_raw_materials', updated);
  deleteDocFromFirestore('raw_materials', id);
  return updated;
}

export function adjustRawMaterialStock(id, qty, type = 'add', reason = 'Stock Movement', inwardUnitCost = null) {
  const list = getRawMaterials();
  const numQty = Number(qty);
  if (!Number.isFinite(numQty) || numQty <= 0) throw new Error('Enter a quantity greater than zero.');
  if (Math.abs(numQty - Math.round(numQty * 1000) / 1000) > 0.0000001) throw new Error('Use at most three decimal places for stock quantity.');
  if (inwardUnitCost != null && (!Number.isFinite(Number(inwardUnitCost)) || Number(inwardUnitCost) < 0)) throw new Error('Enter a valid inward unit cost.');
  if (type !== 'add' && type !== 'subtract') throw new Error('Invalid stock movement type.');
  const current = list.find((m) => m.id === id);
  if (!current) throw new Error('Raw material was not found.');
  if (type === 'subtract' && numQty > Number(current.currentStock)) {
    throw new Error(`Only ${current.currentStock} ${current.unit} of ${current.name} is available.`);
  }

  let affected = null;
  const updated = list.map((m) => {
    if (m.id === id) {
      const newStock = type === 'add' ? Number(m.currentStock) + numQty : Number(m.currentStock) - numQty;
      const unitCost = type === 'add' && inwardUnitCost != null && newStock > 0
        ? ((Number(m.currentStock) * Number(m.unitCost)) + (numQty * Number(inwardUnitCost))) / newStock
        : Number(m.unitCost);
      affected = { ...m, currentStock: parseFloat(newStock.toFixed(3)), unitCost: Number(unitCost.toFixed(2)) };
      return affected;
    }
    return m;
  });

  setStored('tbk_raw_materials', updated);
  if (affected) {
    syncDocToFirestore('raw_materials', affected.id, affected);
    addStockMovement({
      materialId: affected.id,
      material: affected.name,
      type: type === 'add' ? 'inward' : 'outward',
      qty: numQty,
      unit: affected.unit,
      source: reason,
      user: 'Current User',
    });
  }
  return updated;
}

// ─── Utensils & Assets API ───────────────────────────────────
export function getUtensils() {
  return getStored('tbk_utensils', DEFAULT_UTENSILS);
}

export function saveUtensil(utensil) {
  const list = getUtensils();
  const totalQty = Number(utensil.totalQty);
  const inUse = Number(utensil.inUse || 0);
  const inCleaning = Number(utensil.inCleaning || 0);
  if (![totalQty, inUse, inCleaning].every((value) => Number.isInteger(value) && value >= 0) || inUse + inCleaning > totalQty) {
    throw new Error('Utensil quantities must be whole numbers, and active use plus cleaning cannot exceed total owned.');
  }
  let updated;
  let saved;
  if (utensil.id && list.some((u) => u.id === utensil.id)) {
    updated = list.map((u) => {
      if (u.id === utensil.id) {
        saved = { ...u, ...utensil, totalQty, inUse, inCleaning };
        return saved;
      }
      return u;
    });
  } else {
    const id = utensil.id || inventoryId('UTN');
    saved = { ...utensil, id, totalQty, inUse, inCleaning };
    updated = [...list, saved];
  }
  setStored('tbk_utensils', updated);
  syncDocToFirestore('utensils', saved.id, saved);
  return updated;
}

export function deleteUtensil(id) {
  const list = getUtensils();
  const updated = list.filter((u) => u.id !== id);
  setStored('tbk_utensils', updated);
  deleteDocFromFirestore('utensils', id);
  return updated;
}

export function adjustUtensilStock(id, qtyToAdd, reason = 'Purchase Inward') {
  const list = getUtensils();
  const numQty = Number(qtyToAdd);
  if (!Number.isInteger(numQty) || numQty <= 0) throw new Error('Enter a positive whole number of utensils.');
  if (!list.some((utensil) => utensil.id === id)) throw new Error('Utensil was not found.');
  let affected;
  const updated = list.map((u) => {
    if (u.id === id) {
      affected = { ...u, totalQty: u.totalQty + numQty };
      return affected;
    }
    return u;
  });
  setStored('tbk_utensils', updated);
  if (affected) syncDocToFirestore('utensils', affected.id, affected);
  return updated;
}

// ─── Combos & Bohra Thaals API ───────────────────────────────
export function getCombos() {
  return getStored('tbk_combos', DEFAULT_COMBOS);
}

export function saveCombo(combo) {
  const list = getCombos();
  let updated;
  let saved;
  if (combo.id && list.some((c) => c.id === combo.id)) {
    updated = list.map((c) => {
      if (c.id === combo.id) {
        saved = { ...c, ...combo, price: Number(combo.price) || 0 };
        return saved;
      }
      return c;
    });
  } else {
    const id = combo.id || `CMB-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...combo, id, price: Number(combo.price) || 0, isAvailable: true };
    updated = [...list, saved];
  }
  setStored('tbk_combos', updated);
  syncDocToFirestore('combos', saved.id, saved);
  return updated;
}

export function deleteCombo(id) {
  const list = getCombos();
  const updated = list.filter((c) => c.id !== id);
  setStored('tbk_combos', updated);
  deleteDocFromFirestore('combos', id);
  return updated;
}

// ─── Modifiers & Add-ons API ─────────────────────────────────
export function getModifiers() {
  return getStored('tbk_modifiers', DEFAULT_MODIFIERS);
}

export function saveModifier(mod) {
  const list = getModifiers();
  let updated;
  let saved;
  if (mod.id && list.some((m) => m.id === mod.id)) {
    updated = list.map((m) => {
      if (m.id === mod.id) {
        saved = { ...m, ...mod };
        return saved;
      }
      return m;
    });
  } else {
    const id = mod.id || `MOD-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...mod, id };
    updated = [...list, saved];
  }
  setStored('tbk_modifiers', updated);
  syncDocToFirestore('modifiers', saved.id, saved);
  return updated;
}

export function deleteModifier(id) {
  const list = getModifiers();
  const updated = list.filter((m) => m.id !== id);
  setStored('tbk_modifiers', updated);
  deleteDocFromFirestore('modifiers', id);
  return updated;
}

// ─── Staff API ───────────────────────────────────────────────
export function getStaff() {
  return getStored('tbk_staff', DEFAULT_STAFF);
}

export function saveStaff(member) {
  const list = getStaff();
  let updated;
  let saved;
  if (member.id && list.some((s) => s.id === member.id)) {
    updated = list.map((s) => {
      if (s.id === member.id) {
        saved = { ...s, ...member, salary: Number(member.salary) || 0 };
        return saved;
      }
      return s;
    });
  } else {
    const id = member.id || `EMP-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...member, id, salary: Number(member.salary) || 0, status: 'active', joinedDate: new Date().toISOString().split('T')[0] };
    updated = [...list, saved];
  }
  setStored('tbk_staff', updated);
  syncDocToFirestore('staff', saved.id, saved);
  return updated;
}

export function deleteStaff(id) {
  const list = getStaff();
  const updated = list.filter((s) => s.id !== id);
  setStored('tbk_staff', updated);
  deleteDocFromFirestore('staff', id);
  return updated;
}

// ─── Branches Outlets API ────────────────────────────────────
export function getBranches() {
  return getStored('tbk_branches', DEFAULT_BRANCHES);
}

export function saveBranch(branch) {
  const list = getBranches();
  let updated;
  let saved;
  if (branch.id && list.some((b) => b.id === branch.id)) {
    updated = list.map((b) => {
      if (b.id === branch.id) {
        saved = { ...b, ...branch, tablesCount: Number(branch.tablesCount) || 0 };
        return saved;
      }
      return b;
    });
  } else {
    const id = branch.id || `BRN-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...branch, id, tablesCount: Number(branch.tablesCount) || 0, status: 'active' };
    updated = [...list, saved];
  }
  setStored('tbk_branches', updated);
  syncDocToFirestore('branches', saved.id, saved);
  return updated;
}

export function deleteBranch(id) {
  const list = getBranches();
  const updated = list.filter((b) => b.id !== id);
  setStored('tbk_branches', updated);
  deleteDocFromFirestore('branches', id);
  return updated;
}

// ─── Users & Roles API ───────────────────────────────────────
export function getUsers() {
  return getStored('tbk_users', DEFAULT_USERS);
}

export function saveUser(user) {
  const list = getUsers();
  let updated;
  let saved;
  if (user.id && list.some((u) => u.id === user.id)) {
    updated = list.map((u) => {
      if (u.id === user.id) {
        saved = { ...u, ...user };
        return saved;
      }
      return u;
    });
  } else {
    const id = user.id || `USR-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...user, id, status: user.status || 'active', lastLogin: user.lastLogin || 'Never' };
    updated = [...list, saved];
  }
  setStored('tbk_users', updated);
  syncDocToFirestore('users', saved.id, saved);
  return updated;
}

export function deleteUser(id) {
  const list = getUsers();
  const updated = list.filter((u) => u.id !== id);
  setStored('tbk_users', updated);
  deleteDocFromFirestore('users', id);
  return updated;
}

// ─── Tables Management API ───────────────────────────────────
export function getTables() {
  return getStored('tbk_tables', DEFAULT_TABLES);
}

export function clearAllTables() {
  setStored('tbk_tables', []);
  try {
    window.dispatchEvent(new CustomEvent('tbk_tables_updated', { detail: [] }));
  } catch (e) { }
  return [];
}

export function saveTable(table) {
  const list = getTables();
  let updated;
  let saved;
  const capacity = Number(table.capacity || table.seats) || 4;
  if (table.id && list.some((t) => t.id === table.id)) {
    updated = list.map((t) => {
      if (t.id === table.id) {
        saved = { ...t, ...table, capacity, seats: capacity };
        return saved;
      }
      return t;
    });
  } else {
    const id = table.id || `T-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...table, id, capacity, seats: capacity, status: table.status || 'available' };
    updated = [...list, saved];
  }
  setStored('tbk_tables', updated);
  syncDocToFirestore('tables', saved.id, saved);
  try {
    window.dispatchEvent(new CustomEvent('tbk_tables_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deleteTable(id) {
  const list = getTables();
  const updated = list.filter((t) => t.id !== id);
  setStored('tbk_tables', updated);
  deleteDocFromFirestore('tables', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_tables_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function assignTableCaptain(tableId, captainName) {
  const list = getTables();
  let affected;
  const updated = list.map((t) => {
    if (t.id === tableId) {
      affected = { ...t, assignedCaptain: captainName };
      return affected;
    }
    return t;
  });
  setStored('tbk_tables', updated);
  if (affected) syncDocToFirestore('tables', affected.id, affected);
  try {
    window.dispatchEvent(new CustomEvent('tbk_tables_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}


// ─── Suppliers & Supply Categories API ───────────────────────
export function getSuppliers() {
  return getStored('tbk_suppliers', DEFAULT_SUPPLIERS);
}

export function saveSupplier(sup) {
  const list = getSuppliers();
  let updated;
  let saved;
  if (sup.id && list.some((s) => s.id === sup.id)) {
    updated = list.map((s) => {
      if (s.id === sup.id) {
        saved = { ...s, ...sup };
        return saved;
      }
      return s;
    });
  } else {
    const id = sup.id || `SUP-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...sup, id };
    updated = [...list, saved];
  }
  setStored('tbk_suppliers', updated);
  syncDocToFirestore('suppliers', saved.id, saved);
  return updated;
}

export function deleteSupplier(id) {
  const list = getSuppliers();
  const updated = list.filter((s) => s.id !== id);
  setStored('tbk_suppliers', updated);
  deleteDocFromFirestore('suppliers', id);
  return updated;
}

export function getSupplyCategories() {
  return getStored('tbk_supply_categories', DEFAULT_SUPPLY_CATEGORIES);
}

export function saveSupplyCategory(catName) {
  const list = getSupplyCategories();
  if (!list.includes(catName)) {
    const updated = [...list, catName];
    setStored('tbk_supply_categories', updated);
    return updated;
  }
  return list;
}

export function deleteSupplyCategory(catName) {
  const list = getSupplyCategories();
  const updated = list.filter((c) => c !== catName);
  setStored('tbk_supply_categories', updated);
  return updated;
}

// ─── Kitchen Stations API ────────────────────────────────────
export function getKitchenStations() {
  return getStored('tbk_kitchen_stations', DEFAULT_KITCHEN_STATIONS);
}

export function saveKitchenStation(station) {
  const list = getKitchenStations();
  let updated;
  let saved;
  if (station.id && list.some((s) => s.id === station.id)) {
    updated = list.map((s) => {
      if (s.id === station.id) {
        saved = { ...s, ...station };
        return saved;
      }
      return s;
    });
  } else {
    const id = station.id || `STN-${String(list.length + 1).padStart(2, '0')}`;
    saved = { ...station, id };
    updated = [...list, saved];
  }
  setStored('tbk_kitchen_stations', updated);
  syncDocToFirestore('kitchen_stations', saved.id, saved);
  return updated;
}

export function deleteKitchenStation(id) {
  const list = getKitchenStations();
  const updated = list.filter((s) => s.id !== id);
  setStored('tbk_kitchen_stations', updated);
  deleteDocFromFirestore('kitchen_stations', id);
  return updated;
}

// ─── Inward Purchase Bills API with Auto-Stock Inward ─────────
export function getPurchaseBills() {
  return getStored('tbk_purchase_bills', DEFAULT_PURCHASE_BILLS);
}

export function savePurchaseBill(bill) {
  const list = getPurchaseBills();
  const id = bill.id || inventoryId('BILL');
  const isExisting = list.some((b) => b.id === id);
  if (!isExisting) {
    if (!Array.isArray(bill.items) || bill.items.length === 0) throw new Error('Add at least one purchased item.');
    for (const item of bill.items) {
      const collection = item.type === 'raw_material' ? getRawMaterials() : item.type === 'utensil' ? getUtensils() : [];
      const quantity = Number(item.qty);
      if (!collection.some((entry) => entry.id === item.itemId) || !Number.isFinite(quantity) || quantity <= 0
        || (item.type === 'utensil' && !Number.isInteger(quantity))
        || (item.type === 'raw_material' && Math.abs(quantity - Math.round(quantity * 1000) / 1000) > 0.0000001)
        || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0) {
        throw new Error('Each purchase bill item needs an existing inventory item, a valid rate, and a positive quantity (whole pieces for utensils).');
      }
    }
  }
  const savedBill = {
    ...bill,
    id,
    billDate: bill.billDate || new Date().toISOString().split('T')[0],
    totalAmount: Number(bill.totalAmount) || 0,
    paymentStatus: bill.paymentStatus || 'pending',
  };

  const updated = isExisting
    ? list.map((b) => (b.id === savedBill.id ? savedBill : b))
    : [savedBill, ...list];

  setStored('tbk_purchase_bills', updated);
  syncDocToFirestore('purchase_bills', savedBill.id, savedBill);

  // Stock is received once when the bill is created. Later edits, including
  // marking it paid, must not receive the same items a second time.
  if (!isExisting) {
    for (const item of bill.items) {
      const qty = Number(item.qty);

      if (item.type === 'raw_material') {
        const rawMats = getRawMaterials();
        const existing = rawMats.find((m) => m.id === item.itemId);
        adjustRawMaterialStock(existing.id, qty, 'add', `Purchase Bill #${savedBill.invoiceNumber || savedBill.id}`, item.unitCost);
      } else if (item.type === 'utensil') {
        const utensils = getUtensils();
        const existing = utensils.find((u) => u.id === item.itemId);
        adjustUtensilStock(existing.id, qty, `Purchase Bill #${savedBill.invoiceNumber || savedBill.id}`);
      }
    }
  }

  return updated;
}

export function deletePurchaseBill(id) {
  const list = getPurchaseBills();
  const updated = list.filter((b) => b.id !== id);
  setStored('tbk_purchase_bills', updated);
  deleteDocFromFirestore('purchase_bills', id);
  return updated;
}

// ─── Orders API (With Full Edit / Delete for Owner) ──────────
export function getOrders() {
  return getStored('tbk_orders', DEFAULT_ORDERS);
}

export function saveOrder(order) {
  const list = getOrders();
  let updated;
  let savedOrder;
  if (order.id && list.some((o) => o.id === order.id)) {
    updated = list.map((o) => {
      if (o.id === order.id) {
        savedOrder = { ...o, ...order };
        return savedOrder;
      }
      return o;
    });
  } else {
    const orderNum = 1000 + list.length + 1;
    savedOrder = {
      ...order,
      id: order.id || `TBK-${orderNum}`,
      orderNumber: order.orderNumber || orderNum,
      createdAt: order.createdAt || new Date().toISOString(),
      status: order.status || 'received',
      paymentStatus: order.paymentStatus || 'pending',
    };
    updated = [savedOrder, ...list];
    try {
      createKotForOrder(savedOrder);
      logAuditEvent({
        action: 'New Order Placed',
        user: savedOrder.captain || 'POS Cashier / Online Guest',
        details: `Order #${savedOrder.id} (${savedOrder.orderType || 'Dine-in'}) for ₹${savedOrder.total || 0}`,
        ip: 'POS Terminal',
      });
    } catch (e) { }
  }
  setStored('tbk_orders', updated);
  syncDocToFirestore('orders', savedOrder.id, savedOrder);
  try {
    window.dispatchEvent(new CustomEvent('tbk_order_changed', { detail: savedOrder }));
  } catch (e) { }
  return updated;
}

export function deleteOrder(orderId) {
  const list = getOrders();
  const updated = list.filter((o) => o.id !== orderId);
  setStored('tbk_orders', updated);
  deleteDocFromFirestore('orders', orderId);
  try {
    logAuditEvent({
      action: 'Order Cancelled / Voided',
      user: 'Manager Override',
      details: `Order #${orderId} was voided/deleted from system`,
      ip: 'POS Terminal',
    });
    window.dispatchEvent(new CustomEvent('tbk_order_changed', { detail: { id: orderId, deleted: true } }));
  } catch (e) { }
  return updated;
}

export function updateOrderStatus(orderId, newStatus) {
  const list = getOrders();
  let affected;
  const updated = list.map((o) => {
    if (o.id === orderId) {
      affected = { ...o, status: newStatus };
      return affected;
    }
    return o;
  });
  setStored('tbk_orders', updated);
  if (affected) {
    syncDocToFirestore('orders', affected.id, affected);
    try {
      window.dispatchEvent(new CustomEvent('tbk_order_changed', { detail: affected }));
    } catch (e) { }
  }
  return updated;
}

export function assignOrder(orderId, { deliveryPartner = null, captain = null, deliveryInstructions = null }) {
  const list = getOrders();
  let affected;
  const updated = list.map((o) => {
    if (o.id === orderId) {
      affected = {
        ...o,
        ...(deliveryPartner !== undefined ? { deliveryPartner } : {}),
        ...(captain !== undefined ? { captain } : {}),
        ...(deliveryInstructions !== undefined ? { deliveryInstructions } : {}),
      };
      return affected;
    }
    return o;
  });
  setStored('tbk_orders', updated);
  if (affected) {
    syncDocToFirestore('orders', affected.id, affected);
    try {
      window.dispatchEvent(new CustomEvent('tbk_order_changed', { detail: affected }));
    } catch (e) { }
  }
  return updated;
}

// ─── Stock Movement Ledger API ───────────────────────────────
export function getStockMovements() {
  return getStored('tbk_stock_movements') || [];
}

export function addStockMovement(movement) {
  const list = getStockMovements();
  const entry = {
    id: inventoryId('MOV'),
    date: new Date().toISOString(),
    ...movement,
  };
  const updated = [entry, ...list];
  setStored('tbk_stock_movements', updated);
  syncDocToFirestore('stock_movements', entry.id, entry);
  logAuditEvent({
    action: `Stock ${entry.type === 'inward' ? 'Received' : 'Deducted'}`,
    user: entry.user || 'System',
    details: `${entry.material} — ${entry.type === 'inward' ? '+' : '-'}${entry.qty} ${entry.unit} — ${entry.source}`,
    ip: 'Inventory Module',
  });
  try {
    window.dispatchEvent(new CustomEvent('tbk_stock_movements_updated'));
  } catch (e) { }
  return updated;
}

// ─── Receipt Designer Template API ───────────────────────────
export function getReceiptTemplate() {
  return getStored('tbk_receipt_template', DEFAULT_RECEIPT_TEMPLATE);
}

export function saveReceiptTemplate(template) {
  setStored('tbk_receipt_template', template);
  syncDocToFirestore('settings', 'receipt_template', template);
  return template;
}

// ─── Portion Availability Engine ─────────────────────────────
export function calculateDishPortionsAvailable(dishId, dishName = '') {
  const recipes = getRecipes();
  const materials = getRawMaterials();

  const recipe = recipes.find(
    (r) => r.dishId === dishId || (dishName && r.dishName.toLowerCase() === dishName.toLowerCase())
  );

  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return { portionsAvailable: null, limitingIngredient: null, recipeFound: false };
  }

  let minPortions = Infinity;
  let limitingIngredient = null;

  for (const ing of recipe.ingredients) {
    const mat = materials.find((m) => m.id === ing.id || m.name.toLowerCase() === ing.name.toLowerCase());
    const requiredPerServing = (Number(ing.qty) || 0) / (Number(recipe.yieldServings) || 1);

    if (requiredPerServing <= 0) continue;
    if (!mat) return { portionsAvailable: 0, limitingIngredient: ing.name, recipeFound: true };

    const available = Math.floor((Number(mat.currentStock) + 0.000000001) / requiredPerServing);
    if (available < minPortions) {
      minPortions = available;
      limitingIngredient = mat.name;
    }
  }

  return {
    portionsAvailable: minPortions === Infinity ? 0 : Math.max(0, minPortions),
    limitingIngredient,
    recipeFound: true,
  };
}

// ─── Order Auto-Deduction Engine ─────────────────────────────
export function assertOrderIngredientsAvailable(orderItems) {
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const requirements = new Map();

  for (const item of orderItems) {
    const recipe = recipes.find(
      (r) => r.dishId === item.id || r.dishName.toLowerCase() === (item.name || '').toLowerCase()
    );

    if (!recipe || !recipe.ingredients) continue;

    const orderedQty = Number(item.quantity || item.qty) || 1;

    for (const ing of recipe.ingredients) {
      const requiredTotal = ((Number(ing.qty) || 0) * orderedQty) / (Number(recipe.yieldServings) || 1);
      if (requiredTotal <= 0) continue;

      const matIndex = rawMaterials.findIndex(
        (m) => m.id === ing.id || m.name.toLowerCase() === ing.name.toLowerCase()
      );

      if (matIndex === -1) throw new Error(`${ing.name} is missing from raw materials.`);
      const material = rawMaterials[matIndex];
      requirements.set(material.id, (requirements.get(material.id) || 0) + requiredTotal);
    }
  }

  for (const [id, required] of requirements) {
    const material = rawMaterials.find((m) => m.id === id);
    if (required > Number(material.currentStock) + 0.000000001) {
      throw new Error(`Not enough ${material.name}: need ${required.toFixed(2)} ${material.unit}, available ${material.currentStock} ${material.unit}.`);
    }
  }
  return requirements;
}

export function deductIngredientsForOrder(orderItems, orderRefId = 'KOT') {
  const requirements = assertOrderIngredientsAvailable(orderItems);
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const deductedSummary = [];

  for (const item of orderItems) {
    const recipe = recipes.find(
      (r) => r.dishId === item.id || r.dishName.toLowerCase() === (item.name || '').toLowerCase()
    );
    if (!recipe?.ingredients) continue;
    const orderedQty = Number(item.quantity || item.qty) || 1;
    for (const ing of recipe.ingredients) {
      const requiredTotal = ((Number(ing.qty) || 0) * orderedQty) / (Number(recipe.yieldServings) || 1);
      if (requiredTotal <= 0) continue;
      const matIndex = rawMaterials.findIndex(
        (m) => m.id === ing.id || m.name.toLowerCase() === ing.name.toLowerCase()
      );
      if (matIndex !== -1) {
        const current = Number(rawMaterials[matIndex].currentStock);
        const newStock = parseFloat((current - requiredTotal).toFixed(6));
        rawMaterials[matIndex].currentStock = newStock;

        deductedSummary.push({
          materialName: rawMaterials[matIndex].name,
          deductedQty: requiredTotal,
          unit: rawMaterials[matIndex].unit,
          remainingStock: newStock,
        });

        addStockMovement({
          materialId: rawMaterials[matIndex].id,
          material: rawMaterials[matIndex].name,
          type: 'outward',
          qty: requiredTotal,
          unit: rawMaterials[matIndex].unit,
          source: `Order #${orderRefId} (${orderedQty}x ${item.name})`,
          user: 'POS Auto-Deduction',
        });
      }
    }
  }

  setStored('tbk_raw_materials', rawMaterials);
  rawMaterials.filter((rm) => requirements.has(rm.id)).forEach((rm) => syncDocToFirestore('raw_materials', rm.id, rm));
  return deductedSummary;
}

// ─── Restaurant Location & Info ──────────────────────────────
export const RESTAURANT_INFO = {
  name: 'The Bharmals Kitchen',
  tagline: 'Authentic Royal Bohra & Mughlai Heritage Dining',
  address: 'Shop 4 & 5, Saifee Jubilee Street, Near Handi Mosque, Bohra Bazaar, Fort, Mumbai, Maharashtra 400001',
  phone: '+91 98200 12345',
  email: 'orders@thebharmalskitchen.com',
  openingHours: '11:00 AM – 11:30 PM (Daily)',
  googleMapsUrl: 'https://maps.google.com/?q=The+Bharmals+Kitchen+Fort+Mumbai',
  googleMapsEmbedUrl: 'https://www.google.com/maps?q=18.9348,72.8358&z=16&output=embed',
  fssaiNumber: '11521004000123',
  gstin: '27AAACB1234F1Z8',
};

// ─── Terms & Conditions API ──────────────────────────────────
export const DEFAULT_TERMS = {
  title: 'Terms of Service & Ordering Policy',
  lastUpdated: '2026-09-26',
  sections: [
    {
      heading: '1. Food Preparation & Halal Guarantee',
      content: 'All meats served at The Bharmals Kitchen are 100% Halal certified, slow-cooked in traditional clay tandoors and handis with pure ingredients and Amul dairy.',
    },
    {
      heading: '2. Online Orders & Payments',
      content: 'Orders placed through our website require 100% advance online payment via UPI, GPay, PhonePe, Paytm, NetBanking, or Cards. Your order is confirmed and dispatched to the kitchen only upon successful payment verification.',
    },
    {
      heading: '3. Cancellation & Modification Policy',
      content: 'Due to our fresh-cooked Bohra thaal and dum handi preparations, orders cannot be cancelled once cooking has commenced in the kitchen. To modify before cooking begins, contact our manager immediately at +91 98200 12345.',
    },
    {
      heading: '4. Delivery & Self-Pickup Timings',
      content: 'Standard preparation time is 25–40 minutes depending on order volume and royal package size. Hot packaging is guaranteed. Delivery radius is up to 12 km from Fort, Mumbai.',
    },
    {
      heading: '5. Allergens & Special Instructions',
      content: 'Certain dishes and Bohra sweets contain dry fruits (almonds, pistachios) and dairy. Please mention any food allergies in the special instructions box before completing payment.',
    },
  ],
};

export function getTermsAndConditions() {
  return getStored('tbk_terms', DEFAULT_TERMS);
}

export function saveTermsAndConditions(terms) {
  setStored('tbk_terms', terms);
  syncDocToFirestore('settings', 'terms_and_conditions', terms);
  return terms;
}

// ─── UPI & Payment Settings API ──────────────────────────────
export const DEFAULT_UPI_SETTINGS = {
  upiId: 'thebharmalskitchen@okhdfcbank',
  merchantName: 'The Bharmals Kitchen',
  businessType: 'Restaurant & Caterers',
  allowCustomAmount: true,
  autoVerifyDelaySec: 3,
};

export function getUpiSettings() {
  return getStored('tbk_upi_settings', DEFAULT_UPI_SETTINGS);
}

export function saveUpiSettings(settings) {
  setStored('tbk_upi_settings', settings);
  syncDocToFirestore('settings', 'upi_config', settings);
  return settings;
}

// ─── Customer Inquiries & Job Inbox API ────────────────────────
export const DEFAULT_INBOX = [
  {
    id: 'MSG-101',
    type: 'joining',
    name: 'Taha Merchant',
    email: 'taha.merchant@gmail.com',
    phone: '+91 98205 66778',
    subject: 'Application for Tandoor Commis Chef',
    message: 'Respected Mustafa Bhai, I have 4 years experience in Bohra Mughlai kebabs and tandoor bread making. I would love to join The Bharmals Kitchen team.',
    status: 'unread',
    createdAt: '2026-09-26T14:15:00.000Z',
  },
  {
    id: 'MSG-102',
    type: 'catering',
    name: 'Zainab Lokhandwala',
    email: 'zainab.l@yahoo.com',
    phone: '+91 98199 44332',
    subject: 'Bulk Royal Thaal Booking for 50 Guests',
    message: 'Salam, we have an upcoming family celebration on next Sunday and want to order 7 Bohra Thaals with Mutton Biryani and Gol Rotli. Please call me back.',
    status: 'unread',
    createdAt: '2026-09-26T15:40:00.000Z',
  },
];

export function getInboxMessages() {
  return getStored('tbk_inbox', DEFAULT_INBOX);
}

export function saveInboxMessage(msg) {
  const list = getInboxMessages();
  const id = msg.id || `MSG-${Date.now().toString().slice(-4)}`;
  const newMsg = {
    ...msg,
    id,
    status: msg.status || 'unread',
    createdAt: msg.createdAt || new Date().toISOString(),
  };
  const updated = [newMsg, ...list.filter((m) => m.id !== id)];
  setStored('tbk_inbox', updated);
  syncDocToFirestore('inbox_messages', id, newMsg);
  return updated;
}

export function deleteInboxMessage(id) {
  const list = getInboxMessages();
  const updated = list.filter((m) => m.id !== id);
  setStored('tbk_inbox', updated);
  deleteDocFromFirestore('inbox_messages', id);
  return updated;
}

export function updateInboxMessageStatus(id, newStatus) {
  const list = getInboxMessages();
  let affected;
  const updated = list.map((m) => {
    if (m.id === id) {
      affected = { ...m, status: newStatus };
      return affected;
    }
    return m;
  });
  setStored('tbk_inbox', updated);
  if (affected) syncDocToFirestore('inbox_messages', id, affected);
  return updated;
}

// ─── Shift Register & Shift Settings API ──────────────────────
export const DEFAULT_SHIFTS = [
  {
    id: 'SHF-201',
    cashier: 'Salman Mansoori',
    shiftName: 'Lunch Shift (11 AM - 4 PM)',
    openedAt: '2026-09-25T11:00:00Z',
    closedAt: '2026-09-25T16:00:00Z',
    openingCash: 3000,
    totalSales: 24500,
    status: 'closed',
    expectedCash: 12400,
    actualCash: 12400,
    variance: 0,
  },
  {
    id: 'SHF-202',
    cashier: 'Mustafa Bharmal',
    shiftName: 'Dinner Shift (4 PM - 12 AM)',
    openedAt: '2026-09-25T16:05:00Z',
    closedAt: null,
    openingCash: 5000,
    totalSales: 38900,
    status: 'active',
    expectedCash: 18200,
    actualCash: null,
    variance: null,
  },
];

export function getShifts() {
  return getStored('tbk_shifts', DEFAULT_SHIFTS);
}

export function saveShift(shift) {
  const list = getShifts();
  let updated;
  let saved;
  if (shift.id && list.some((s) => s.id === shift.id)) {
    updated = list.map((s) => {
      if (s.id === shift.id) {
        saved = { ...s, ...shift };
        return saved;
      }
      return s;
    });
  } else {
    const id = shift.id || `SHF-${Math.floor(100 + Math.random() * 900)}`;
    saved = { ...shift, id };
    updated = [saved, ...list];
  }
  setStored('tbk_shifts', updated);
  syncDocToFirestore('shifts', saved.id, saved);
  return updated;
}

export function deleteShift(shiftId) {
  const list = getShifts();
  const updated = list.filter((s) => s.id !== shiftId);
  setStored('tbk_shifts', updated);
  deleteDocFromFirestore('shifts', shiftId);
  return updated;
}

// ─── Order Channels & Payment Rules API ────────────────────────
export const DEFAULT_CHANNEL_SETTINGS = {
  allowDineIn: true,
  allowTakeaway: true,
  allowDelivery: true, // Customizable via admin
  paymentMethods: {
    delivery: ['upi'], // Online delivery default only UPI
    takeaway: ['upi', 'cash'], // Takeaway/pickup shows both
    dine_in: ['upi', 'cash', 'card'], // Dine-in shows all
  },
  deliveryUnavailableReason: 'Delivery is temporarily paused from restaurant side. Please order for Takeaway or Dine-in!',
  deliveryFee: 40,
  minDeliveryOrder: 200,
  allowCashOnDelivery: false,
};

export function getChannelSettings() {
  return getStored('tbk_channel_settings', DEFAULT_CHANNEL_SETTINGS);
}

export function saveChannelSettings(settings) {
  setStored('tbk_channel_settings', settings);
  syncDocToFirestore('settings', 'channels', settings);
  try {
    window.dispatchEvent(new CustomEvent('tbk_channel_settings_updated', { detail: settings }));
  } catch (e) { }
  return settings;
}

// ─── Payment Gateway Configuration & Setup API ────────────────
export const DEFAULT_GATEWAY_CONFIG = {
  activeGateway: 'upi_direct', // upi_direct, razorpay, cashfree, phonepe, paytm
  environment: 'sandbox', // sandbox, live
  upiId: 'thebharmalskitchen@icici',
  merchantName: 'The Bharmals Kitchen Fort',
  mcc: '5812',
  razorpayKeyId: 'rzp_test_BharmalKitchenKey99',
  razorpayKeySecret: '••••••••••••••••••••',
  cashfreeAppId: '',
  cashfreeSecretKey: '',
  phonepeMerchantId: '',
  phonepeSaltKey: '',
  autoVerifyUpi: true,
};

export function getPaymentGatewayConfig() {
  return getStored('tbk_payment_gateway_config', DEFAULT_GATEWAY_CONFIG);
}

export function savePaymentGatewayConfig(config) {
  setStored('tbk_payment_gateway_config', config);
  syncDocToFirestore('settings', 'payment_gateway', config);
  return config;
}

// ─── Restaurant Profile, Address & GST Settings API ────────────
export const DEFAULT_RESTAURANT_SETTINGS = {
  name: RESTAURANT_INFO.name,
  tagline: RESTAURANT_INFO.tagline,
  fssai: RESTAURANT_INFO.fssaiNumber,
  gstin: RESTAURANT_INFO.gstin,
  phone: RESTAURANT_INFO.phone,
  email: RESTAURANT_INFO.email,
  address: RESTAURANT_INFO.address,
  cgstRate: 0,
  sgstRate: 0,
  serviceCharge: 0,
  roundOff: true,
  isCompositionScheme: false,
  applyGstOnTakeaway: true,
  applyGstOnDelivery: true,
  // Prepaid Smart Card Wallet Settings
  enable_recharge_bonus: true,
  recharge_bonus_percentage: 0.0,
  googleMapUrl: RESTAURANT_INFO.googleMapsUrl,
  isOpen: true,
};

export function getRestaurantSettings() {
  return getStored('tbk_restaurant_settings', DEFAULT_RESTAURANT_SETTINGS);
}

export function saveRestaurantSettings(settings) {
  setStored('tbk_restaurant_settings', settings);
  syncDocToFirestore('settings', 'profile', settings);
  try {
    window.dispatchEvent(new CustomEvent('tbk_restaurant_settings_updated', { detail: settings }));
  } catch (e) { }
  return settings;
}

// ─── POS Terminal Rules & Workflow API ─────────────────────────
export const DEFAULT_POS_SETTINGS = {
  autoPrintKOTOnOrder: true,
  requireTableNumberForDineIn: true,
  allowCustomItemDiscounts: true,
  askCustomerPhoneOnCheckout: true,
  defaultPaymentMethod: 'cash',
  enableSoundOnCartAdd: true,
};

export function getPOSSettings() {
  return getStored('tbk_pos_settings', DEFAULT_POS_SETTINGS);
}

export function savePOSSettings(settings) {
  setStored('tbk_pos_settings', settings);
  syncDocToFirestore('settings', 'pos_rules', settings);
  return settings;
}

// ─── Notifications & Alerts Settings API ───────────────────────
export const DEFAULT_NOTIFICATION_SETTINGS = {
  soundAlertOnNewOrder: true,
  soundAlertOnKOTReady: true,
  browserPushNotifications: true,
  whatsappOrderUpdates: false,
  lowStockAlerts: true,
  dailySalesSummaryEmail: false,
};

export function getNotificationSettings() {
  return getStored('tbk_notification_settings', DEFAULT_NOTIFICATION_SETTINGS);
}

export function saveNotificationSettings(settings) {
  setStored('tbk_notification_settings', settings);
  syncDocToFirestore('settings', 'notifications', settings);
  return settings;
}

// ─── Customer Directory & Prepaid NFC Smart Card Wallet API ───
export function getCustomers() {
  return getStored('tbk_customers', DEFAULT_CUSTOMERS);
}

export function saveCustomer(cust) {
  const list = getCustomers();
  let updated;
  let saved;
  const wallet_balance = parseFloat(cust.wallet_balance !== undefined ? cust.wallet_balance : 0.0);
  const nfc_uid = (cust.nfc_uid || '').trim();

  if (cust.id && list.some((c) => c.id === cust.id)) {
    updated = list.map((c) => {
      if (c.id === cust.id) {
        saved = { ...c, ...cust, wallet_balance, nfc_uid };
        return saved;
      }
      return c;
    });
  } else {
    const id = cust.id || `CUST-${String(list.length + 101)}`;
    saved = {
      ...cust,
      id,
      wallet_balance,
      nfc_uid,
      visits: cust.visits || 0,
      totalSpent: cust.totalSpent || 0,
      loyaltyPoints: cust.loyaltyPoints || 0,
      tier: cust.tier || 'Silver',
      wallet_transactions: cust.wallet_transactions || [],
      createdAt: new Date().toISOString(),
    };
    updated = [saved, ...list];
  }

  setStored('tbk_customers', updated);
  syncDocToFirestore('customers', saved.id, saved);
  try {
    window.dispatchEvent(new CustomEvent('tbk_customers_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deleteCustomer(id) {
  const list = getCustomers();
  const updated = list.filter((c) => c.id !== id);
  setStored('tbk_customers', updated);
  deleteDocFromFirestore('customers', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_customers_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function findCustomerByNfcUid(nfcUid) {
  if (!nfcUid) return null;
  const list = getCustomers();
  const cleanUid = nfcUid.trim().toLowerCase();
  return list.find((c) => (c.nfc_uid || '').trim().toLowerCase() === cleanUid) || null;
}

export function linkCustomerNfcCard(customerId, nfcUid) {
  const list = getCustomers();
  const cleanUid = (nfcUid || '').trim();

  // Check if this UID is already assigned to another customer
  const existing = list.find((c) => c.id !== customerId && (c.nfc_uid || '').toLowerCase() === cleanUid.toLowerCase());
  if (existing) {
    throw new Error(`This NFC Smart Card is already registered to "${existing.name}" (${existing.phone}).`);
  }

  let updatedCustomer = null;
  const updated = list.map((c) => {
    if (c.id === customerId) {
      updatedCustomer = { ...c, nfc_uid: cleanUid };
      return updatedCustomer;
    }
    return c;
  });

  if (updatedCustomer) {
    setStored('tbk_customers', updated);
    syncDocToFirestore('customers', customerId, updatedCustomer);
    try {
      window.dispatchEvent(new CustomEvent('tbk_customers_updated', { detail: updated }));
    } catch (e) { }
  }
  return updatedCustomer;
}

/**
 * Recharge Customer Prepaid Wallet Card
 * Reads recharge_bonus_percentage from settings (e.g. ₹400 + 10% = ₹440)
 */
export function rechargeCustomerWallet(customerIdOrUid, amountPaid, cashierName = 'Cashier') {
  const list = getCustomers();
  const paid = parseFloat(amountPaid);
  if (isNaN(paid) || paid <= 0) {
    throw new Error('Please provide a valid positive recharge amount');
  }

  const settings = getRestaurantSettings();
  const bonusEnabled = settings.enable_recharge_bonus !== false;
  const bonusPercent = bonusEnabled ? (parseFloat(settings.recharge_bonus_percentage) || 10.0) : 0;
  const bonusAmount = parseFloat(((paid * bonusPercent) / 100).toFixed(2));
  const totalCredit = parseFloat((paid + bonusAmount).toFixed(2));

  let targetCustomer = list.find((c) => c.id === customerIdOrUid || (c.nfc_uid || '').toLowerCase() === customerIdOrUid.toLowerCase());
  if (!targetCustomer) {
    throw new Error('Customer or NFC Card not found');
  }

  const newBalance = parseFloat(((targetCustomer.wallet_balance || 0) + totalCredit).toFixed(2));
  const newTx = {
    id: `WTX-${Date.now().toString().slice(-6)}`,
    type: 'recharge',
    amount: paid,
    bonus: bonusAmount,
    totalCredit: totalCredit,
    timestamp: new Date().toISOString(),
    cashier: cashierName,
  };

  const updatedTransactions = [newTx, ...(targetCustomer.wallet_transactions || [])];

  const updatedCustomer = {
    ...targetCustomer,
    wallet_balance: newBalance,
    wallet_transactions: updatedTransactions,
    lastRecharge: new Date().toISOString(),
  };

  const updatedList = list.map((c) => (c.id === targetCustomer.id ? updatedCustomer : c));
  setStored('tbk_customers', updatedList);
  syncDocToFirestore('customers', targetCustomer.id, updatedCustomer);

  // Also record cash drawer inward transaction for the cash paid
  try {
    saveCashTransaction({
      type: 'in',
      reason: `NFC Smart Card Recharge (#${targetCustomer.name})`,
      amount: paid,
      cashier: cashierName,
    });
  } catch (e) { }

  try {
    window.dispatchEvent(new CustomEvent('tbk_customers_updated', { detail: updatedList }));
  } catch (e) { }

  return {
    customer: updatedCustomer,
    rechargeAmount: paid,
    bonusAmount,
    totalCredit,
    newBalance,
  };
}

/**
 * Debit Customer Prepaid Smart Card for an Order
 */
export function debitCustomerWallet(customerIdOrUid, amount, orderId = null) {
  const list = getCustomers();
  const billAmount = parseFloat(amount);
  if (isNaN(billAmount) || billAmount <= 0) {
    throw new Error('Invalid bill amount');
  }

  const targetCustomer = list.find((c) => c.id === customerIdOrUid || (c.nfc_uid || '').toLowerCase() === customerIdOrUid.toLowerCase());
  if (!targetCustomer) {
    throw new Error('NFC Card is not registered to any customer');
  }

  const currentBal = parseFloat(targetCustomer.wallet_balance || 0);
  if (currentBal < billAmount) {
    const deficit = parseFloat((billAmount - currentBal).toFixed(2));
    const err = new Error(`Insufficient wallet balance! Current Balance: ₹${currentBal.toFixed(2)}. Needed: ₹${billAmount.toFixed(2)} (Deficit: ₹${deficit.toFixed(2)})`);
    err.currentBalance = currentBal;
    err.deficit = deficit;
    throw err;
  }

  const newBalance = parseFloat((currentBal - billAmount).toFixed(2));
  const newTx = {
    id: `WTX-${Date.now().toString().slice(-6)}`,
    type: 'debit',
    amount: billAmount,
    timestamp: new Date().toISOString(),
    orderId: orderId || 'POS-ORDER',
  };

  const updatedCustomer = {
    ...targetCustomer,
    wallet_balance: newBalance,
    totalSpent: (targetCustomer.totalSpent || 0) + billAmount,
    visits: (targetCustomer.visits || 0) + 1,
    loyaltyPoints: (targetCustomer.loyaltyPoints || 0) + Math.floor(billAmount / 20),
    lastVisit: new Date().toISOString().split('T')[0],
    wallet_transactions: [newTx, ...(targetCustomer.wallet_transactions || [])],
  };

  const updatedList = list.map((c) => (c.id === targetCustomer.id ? updatedCustomer : c));
  setStored('tbk_customers', updatedList);
  syncDocToFirestore('customers', targetCustomer.id, updatedCustomer);

  try {
    window.dispatchEvent(new CustomEvent('tbk_customers_updated', { detail: updatedList }));
  } catch (e) { }

  return {
    customer: updatedCustomer,
    debitedAmount: billAmount,
    remainingBalance: newBalance,
  };
}

// ─── Table Reservations API ──────────────────────────────────
export function getReservations() {
  return getStored('tbk_reservations', DEFAULT_RESERVATIONS);
}

export function saveReservation(res) {
  const list = getReservations();
  let updated;
  let saved;
  if (res.id && list.some((r) => r.id === res.id)) {
    updated = list.map((r) => {
      if (r.id === res.id) {
        saved = { ...r, ...res };
        return saved;
      }
      return r;
    });
  } else {
    const id = res.id || `RES-${Math.floor(300 + Math.random() * 600)}`;
    saved = { ...res, id, status: res.status || 'confirmed', createdAt: new Date().toISOString() };
    updated = [saved, ...list];
  }
  setStored('tbk_reservations', updated);
  syncDocToFirestore('reservations', saved.id, saved);
  return updated;
}

export function deleteReservation(id) {
  const list = getReservations();
  const updated = list.filter((r) => r.id !== id);
  setStored('tbk_reservations', updated);
  deleteDocFromFirestore('reservations', id);
  return updated;
}

export function updateReservationStatus(id, newStatus) {
  const list = getReservations();
  let affected;
  const updated = list.map((r) => {
    if (r.id === id) {
      affected = { ...r, status: newStatus };
      return affected;
    }
    return r;
  });
  setStored('tbk_reservations', updated);
  if (affected) syncDocToFirestore('reservations', id, affected);
  return updated;
}

// ─── Guest Waitlist API ──────────────────────────────────────
export function getWaitlist() {
  return getStored('tbk_waitlist', DEFAULT_WAITLIST);
}

export function saveWaitlist(guest) {
  const list = getWaitlist();
  const id = guest.id || `WL-${String(list.length + 1).padStart(2, '0')}`;
  const saved = {
    ...guest,
    id,
    guests: Number(guest.guests) || 2,
    quotedMinutes: Number(guest.quotedMinutes) || 15,
    elapsedMinutes: guest.elapsedMinutes || 0,
    status: guest.status || 'waiting',
    createdAt: new Date().toISOString(),
  };
  const updated = [...list, saved];
  setStored('tbk_waitlist', updated);
  syncDocToFirestore('waitlist', saved.id, saved);
  return updated;
}

export function deleteWaitlist(id) {
  const list = getWaitlist();
  const updated = list.filter((w) => w.id !== id);
  setStored('tbk_waitlist', updated);
  deleteDocFromFirestore('waitlist', id);
  return updated;
}

export function notifyWaitlist(id) {
  const list = getWaitlist();
  let affected;
  const updated = list.map((w) => {
    if (w.id === id) {
      affected = { ...w, status: 'notified' };
      return affected;
    }
    return w;
  });
  setStored('tbk_waitlist', updated);
  if (affected) syncDocToFirestore('waitlist', id, affected);
  return updated;
}

// ─── Staff Leaves & Time-Off API (Paid & Unpaid) ──────────────
export function getLeaves() {
  return getStored('tbk_leaves', DEFAULT_LEAVES);
}

export function saveLeave(leave) {
  const list = getLeaves();
  let updated;
  let saved;
  const days = Number(leave.days) || 1;
  const isPaid = leave.isPaid !== undefined ? Boolean(leave.isPaid) : false;

  if (leave.id && list.some((l) => l.id === leave.id)) {
    updated = list.map((l) => {
      if (l.id === leave.id) {
        saved = { ...l, ...leave, days, isPaid };
        return saved;
      }
      return l;
    });
  } else {
    const id = leave.id || `LEV-${Math.floor(100 + Math.random() * 900)}`;
    saved = { ...leave, id, days, isPaid, status: leave.status || 'pending', createdAt: new Date().toISOString() };
    updated = [saved, ...list];
  }
  setStored('tbk_leaves', updated);
  syncDocToFirestore('leaves', saved.id, saved);
  return updated;
}

export function deleteLeave(id) {
  const list = getLeaves();
  const updated = list.filter((l) => l.id !== id);
  setStored('tbk_leaves', updated);
  deleteDocFromFirestore('leaves', id);
  return updated;
}

export function updateLeaveStatus(id, newStatus) {
  const list = getLeaves();
  let affected;
  const updated = list.map((l) => {
    if (l.id === id) {
      affected = { ...l, status: newStatus };
      return affected;
    }
    return l;
  });
  setStored('tbk_leaves', updated);
  if (affected) syncDocToFirestore('leaves', id, affected);
  return updated;
}

// ─── Staff Advances API ───────────────────────────────────────
export function getAdvances() {
  return getStored('tbk_advances', DEFAULT_ADVANCES);
}

export function saveAdvance(adv) {
  const list = getAdvances();
  const id = adv.id || `ADV-${Math.floor(300 + Math.random() * 600)}`;
  const saved = {
    ...adv,
    id,
    amount: Number(adv.amount) || 0,
    date: adv.date || new Date().toISOString().split('T')[0],
    status: adv.status || 'approved',
  };
  const updated = [saved, ...list];
  setStored('tbk_advances', updated);
  syncDocToFirestore('advances', saved.id, saved);
  return updated;
}

export function deleteAdvance(id) {
  const list = getAdvances();
  const updated = list.filter((a) => a.id !== id);
  setStored('tbk_advances', updated);
  deleteDocFromFirestore('advances', id);
  return updated;
}

// ─── Staff Attendance API (strictly linked to current Staff) ───
export function getAttendance() {
  const staffList = getStaff();
  const stored = getStored('tbk_attendance_records', {});
  const todayKey = new Date().toISOString().split('T')[0];
  const todayRecords = stored[todayKey] || [];

  // Map only existing active staff
  return staffList.map((s) => {
    const existing = todayRecords.find((r) => r.empId === s.id);
    if (existing) return existing;
    return {
      empId: s.id,
      name: s.name,
      role: s.role,
      checkIn: '—',
      checkOut: '—',
      status: 'present',
    };
  });
}

export function markAttendance(empId, newStatus) {
  const current = getAttendance();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const updated = current.map((r) => {
    if (r.empId === empId) {
      return {
        ...r,
        status: newStatus,
        checkIn: newStatus === 'present' && r.checkIn === '—' ? now : r.checkIn,
      };
    }
    return r;
  });

  const stored = getStored('tbk_attendance_records', {});
  const todayKey = new Date().toISOString().split('T')[0];
  stored[todayKey] = updated;
  setStored('tbk_attendance_records', stored);

  syncDocToFirestore('attendance', todayKey, { date: todayKey, records: updated });
  return updated;
}

// ─── Monthly Payroll Calculator (Accounting for Unpaid Leaves) ─
export function calculatePayroll(monthStr = 'September 2026') {
  const staffList = getStaff();
  const leavesList = getLeaves().filter((l) => l.status === 'approved');
  const advancesList = getAdvances().filter((a) => a.status === 'approved');

  return staffList.map((s) => {
    const baseSalary = Number(s.salary) || 25000;
    const dailyWage = baseSalary / 30;

    // Sum unpaid leave days for this staff
    const staffUnpaidLeaves = leavesList
      .filter((l) => (l.staffId === s.id || l.staffName === s.name) && l.isPaid === false)
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);

    const leaveDeduction = Math.round(staffUnpaidLeaves * dailyWage);
    const daysPresent = Math.max(0, 26 - staffUnpaidLeaves);

    // Advances
    const staffAdvances = advancesList
      .filter((a) => a.staffId === s.id || a.staffName === s.name)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const bonus = 1500;
    const netPay = Math.max(0, Math.round(baseSalary - leaveDeduction - staffAdvances + bonus));

    return {
      id: `PAY-${s.id}`,
      staffId: s.id,
      name: s.name,
      role: s.role,
      baseSalary,
      daysPresent,
      unpaidLeaveDays: staffUnpaidLeaves,
      leaveDeduction,
      advanceDeduction: staffAdvances,
      bonus,
      netPay,
      status: 'processed',
    };
  });
}

// ─── Cash Drawer Petty Cash API ───────────────────────────────
export function getCashTransactions() {
  return getStored('tbk_cash_transactions', DEFAULT_CASH_TRANSACTIONS);
}

export function saveCashTransaction(tx) {
  const list = getCashTransactions();
  const id = tx.id || `CD-${Math.floor(100 + Math.random() * 900)}`;
  const saved = {
    ...tx,
    id,
    amount: Number(tx.amount) || 0,
    time: tx.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: tx.timestamp || new Date().toISOString(),
  };
  const updated = [saved, ...list];
  setStored('tbk_cash_transactions', updated);
  syncDocToFirestore('cash_drawer', saved.id, saved);
  return updated;
}

// ─── Expenses API ─────────────────────────────────────────────
export function getExpenses() {
  return getStored('tbk_expenses', DEFAULT_EXPENSES);
}

export function saveExpense(exp) {
  const list = getExpenses();
  const id = exp.id || `EXP-${Math.floor(100 + Math.random() * 900)}`;
  const saved = {
    ...exp,
    id,
    amount: Number(exp.amount) || 0,
    date: exp.date || new Date().toISOString().split('T')[0],
  };
  const updated = [saved, ...list];
  setStored('tbk_expenses', updated);
  syncDocToFirestore('expenses', saved.id, saved);
  return updated;
}

export function deleteExpense(id) {
  const list = getExpenses();
  const updated = list.filter((e) => e.id !== id);
  setStored('tbk_expenses', updated);
  deleteDocFromFirestore('expenses', id);
  return updated;
}

// ─── Day Close & Z-Report API ─────────────────────────────────
export function getDayCloseRecords() {
  return getStored('tbk_day_close_history', []);
}

export function saveDayCloseRecord(record) {
  const list = getDayCloseRecords();
  const id = record.id || `ZREP-${Date.now().toString().slice(-6)}`;
  const saved = { ...record, id, closedAt: new Date().toISOString() };
  const updated = [saved, ...list];
  setStored('tbk_day_close_history', updated);
  syncDocToFirestore('day_close', saved.id, saved);
  return updated;
}

// ─── Dynamic Dashboard Metrics API ────────────────────────────
export function getDashboardMetrics() {
  const orders = getOrders();
  const staff = getStaff();
  const tables = getTables();
  const rawMaterials = getRawMaterials();
  const expenses = getExpenses();

  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeOrders = orders.filter((o) => o.status === 'received' || o.status === 'cooking' || o.status === 'ready');
  const occupiedTables = tables.filter((t) => t.status === 'occupied' || t.status === 'billed');
  const lowStockCount = rawMaterials.filter((rm) => (rm.currentStock || 0) <= (rm.reorderLevel || 10)).length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    totalSales,
    totalOrders: orders.length,
    activeOrdersCount: activeOrders.length,
    totalStaff: staff.length,
    occupiedTables: occupiedTables.length,
    totalTables: tables.length,
    lowStockCount,
    totalExpenses,
    grossProfit: Math.max(0, totalSales - totalExpenses),
  };
}

// ─── Purchase Orders (PO) API ────────────────────────────────
export function getPurchaseOrders() {
  return getStored('tbk_purchase_orders', DEFAULT_PURCHASE_ORDERS);
}

export function savePurchaseOrder(po) {
  const list = getPurchaseOrders();
  let savedPO;
  let updated;
  if (po.id && list.some((p) => p.id === po.id)) {
    updated = list.map((p) => {
      if (p.id === po.id) {
        savedPO = { ...p, ...po, totalAmount: Number(po.totalAmount) || p.totalAmount };
        return savedPO;
      }
      return p;
    });
  } else {
    const id = po.id || inventoryId('PO');
    savedPO = {
      ...po,
      id,
      date: po.date || new Date().toISOString().split('T')[0],
      totalAmount: Number(po.totalAmount) || 0,
      status: po.status || 'sent',
    };
    updated = [savedPO, ...list];
  }
  setStored('tbk_purchase_orders', updated);
  syncDocToFirestore('purchase_orders', savedPO.id, savedPO);
  try {
    window.dispatchEvent(new CustomEvent('tbk_purchase_orders_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deletePurchaseOrder(id) {
  const list = getPurchaseOrders();
  const updated = list.filter((p) => p.id !== id);
  setStored('tbk_purchase_orders', updated);
  deleteDocFromFirestore('purchase_orders', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_purchase_orders_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

// ─── Printers API ────────────────────────────────────────────
export function getPrinters() {
  return getStored('tbk_printers', DEFAULT_PRINTERS);
}

export function savePrinter(printer) {
  const list = getPrinters();
  let savedPrinter;
  let updated;
  if (printer.id && list.some((p) => p.id === printer.id)) {
    updated = list.map((p) => {
      if (p.id === printer.id) {
        savedPrinter = { ...p, ...printer };
        return savedPrinter;
      }
      return p;
    });
  } else {
    const id = printer.id || `PRN-${String(list.length + 1).padStart(2, '0')}`;
    savedPrinter = {
      ...printer,
      id,
      status: printer.status || 'online',
    };
    updated = [...list, savedPrinter];
  }
  setStored('tbk_printers', updated);
  syncDocToFirestore('printers', savedPrinter.id, savedPrinter);
  try {
    window.dispatchEvent(new CustomEvent('tbk_printers_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deletePrinter(id) {
  const list = getPrinters();
  const updated = list.filter((p) => p.id !== id);
  setStored('tbk_printers', updated);
  deleteDocFromFirestore('printers', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_printers_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

// ─── Print Routing Matrix API ────────────────────────────────
export function getPrintRouting() {
  return getStored('tbk_print_routing', DEFAULT_PRINT_ROUTING);
}

export function savePrintRouting(routes) {
  setStored('tbk_print_routing', routes);
  syncDocToFirestore('settings', 'print_routing', { routes, updatedAt: new Date().toISOString() });
  try {
    window.dispatchEvent(new CustomEvent('tbk_print_routing_updated', { detail: routes }));
  } catch (e) { }
  return routes;
}

// ─── Print Queue & Spooler API ───────────────────────────────
export function getPrintQueue() {
  return getStored('tbk_print_queue', DEFAULT_PRINT_QUEUE);
}

export function addPrintJob(job) {
  const list = getPrintQueue();
  const id = job.id || `JOB-${Date.now().toString().slice(-4)}`;
  const savedJob = {
    ...job,
    id,
    time: job.time || 'Just now',
    status: job.status || 'pending',
    attempts: job.attempts || 1,
    createdAt: new Date().toISOString(),
  };
  const updated = [savedJob, ...list];
  setStored('tbk_print_queue', updated);
  syncDocToFirestore('print_queue', savedJob.id, savedJob);
  try {
    window.dispatchEvent(new CustomEvent('tbk_print_queue_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function updatePrintJob(id, updates) {
  const list = getPrintQueue();
  let affected;
  const updated = list.map((j) => {
    if (j.id === id) {
      affected = { ...j, ...updates };
      return affected;
    }
    return j;
  });
  setStored('tbk_print_queue', updated);
  if (affected) {
    syncDocToFirestore('print_queue', affected.id, affected);
    try {
      window.dispatchEvent(new CustomEvent('tbk_print_queue_updated', { detail: updated }));
    } catch (e) { }
  }
  return updated;
}

export function clearPrintQueue() {
  setStored('tbk_print_queue', []);
  try {
    window.dispatchEvent(new CustomEvent('tbk_print_queue_updated', { detail: [] }));
  } catch (e) { }
  return [];
}

// ─── Kitchen Order Tickets (KOT) API ─────────────────────────
export function getKots() {
  return getStored('tbk_kots', DEFAULT_KOTS);
}

export function saveKot(kot) {
  const list = getKots();
  let savedKot;
  let updated;
  if (kot.id && list.some((k) => k.id === kot.id)) {
    updated = list.map((k) => {
      if (k.id === kot.id) {
        savedKot = { ...k, ...kot };
        return savedKot;
      }
      return k;
    });
  } else {
    const id = kot.id || `KOT-${Math.floor(800 + Math.random() * 200)}`;
    savedKot = {
      ...kot,
      id,
      createdAt: kot.createdAt || new Date().toISOString(),
      time: kot.time || 'Just now',
      status: kot.status || 'active',
    };
    updated = [savedKot, ...list];
  }
  setStored('tbk_kots', updated);
  syncDocToFirestore('kots', savedKot.id, savedKot);
  try {
    window.dispatchEvent(new CustomEvent('tbk_kots_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function updateKotStatus(id, newStatus) {
  const list = getKots();
  let affected;
  const updated = list.map((k) => {
    if (k.id === id) {
      affected = { ...k, status: newStatus };
      return affected;
    }
    return k;
  });
  setStored('tbk_kots', updated);
  if (affected) {
    syncDocToFirestore('kots', affected.id, affected);
    try {
      window.dispatchEvent(new CustomEvent('tbk_kots_updated', { detail: updated }));
    } catch (e) { }
  }
  return updated;
}

export function deleteKot(id) {
  const list = getKots();
  const updated = list.filter((k) => k.id !== id);
  setStored('tbk_kots', updated);
  deleteDocFromFirestore('kots', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_kots_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function createKotForOrder(order) {
  if (!order || !order.items || order.items.length === 0) return null;
  const itemsSummary = order.items.map((i) => `${i.name} (${i.quantity || 1})`).join(', ');
  const targetStation = order.items[0]?.station || 'Curry / Biryani';
  const tableLabel = order.tableName || order.tableNumber || (order.orderType === 'takeaway' ? 'Takeaway' : order.orderType === 'delivery' ? 'Delivery' : 'Dine-In');

  const kot = {
    id: `KOT-${Math.floor(800 + Math.random() * 200)}`,
    orderId: order.id,
    table: tableLabel,
    station: targetStation,
    items: itemsSummary,
    itemsList: order.items,
    time: 'Just now',
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  return saveKot(kot);
}

// ─── Physical Stock Audit & Variance Reconciliation API ──────
export function reconcilePhysicalStockItem(item, reason = 'Periodic Stock Audit') {
  const materials = getRawMaterials();
  const target = materials.find((m) => m.id === item.id || m.name.toLowerCase() === item.name.toLowerCase());
  if (!target) throw new Error(`${item.name || item.id} is no longer in raw materials.`);

  const currentStock = Number(target.currentStock) || 0;
  if (item.systemStock != null && Math.abs(Number(item.systemStock) - currentStock) > 0.000001) {
    throw new Error(`${target.name} changed since this count was opened. Reload the count and try again.`);
  }
  const parsedCount = Number(item.countedStock);
  if (item.countedStock === '' || item.countedStock == null || !Number.isFinite(parsedCount) || parsedCount < 0) {
    throw new Error(`Enter a valid non-negative count for ${target.name}.`);
  }
  const countedStock = parsedCount;
  const variance = countedStock - currentStock;

  if (variance !== 0) {
    // Update raw material in Firestore
    saveRawMaterial({
      ...target,
      currentStock: countedStock,
    });

    // Record movement in stock ledger
    addStockMovement({
      materialId: target.id,
      material: target.name,
      type: variance > 0 ? 'inward' : 'outward',
      qty: Math.abs(variance),
      unit: target.unit || 'kg',
      source: `Stock Count Reconciliation (${reason})`,
      user: 'Inventory Auditor',
    });

    // Log security audit event
    logAuditEvent({
      action: 'Stock Reconciliation Adjustment',
      user: 'Inventory Auditor',
      details: `${target.name} adjusted from ${currentStock} to ${countedStock} ${target.unit} (${variance > 0 ? '+' : ''}${variance})`,
      ip: 'POS Backoffice',
    });
  }
  return { ...target, currentStock: countedStock, variance };
}

export function reconcileAllPhysicalStock(itemsList) {
  const materials = getRawMaterials();
  for (const item of itemsList) {
    const count = Number(item.countedStock);
    if (item.countedStock === '' || item.countedStock == null || !Number.isFinite(count) || count < 0) {
      throw new Error(`Enter a valid non-negative count for ${item.name}.`);
    }
    const target = materials.find((material) => material.id === item.id);
    if (!target) throw new Error(`${item.name} is no longer in raw materials.`);
    if (item.systemStock != null && Math.abs(Number(item.systemStock) - Number(target.currentStock)) > 0.000001) {
      throw new Error(`${item.name} changed since this count was opened. Reload the count and try again.`);
    }
  }
  for (const item of itemsList) {
    reconcilePhysicalStockItem(item);
  }
  return getRawMaterials();
}

// ─── Kitchen Wastage & Spoilage Log API ───────────────────────
export function getWastageLogs() {
  return getStored('tbk_wastage', DEFAULT_WASTAGE);
}

export function saveWastageLog(log) {
  const list = getWastageLogs();
  const material = getRawMaterials().find((m) => m.id === log.materialId);
  const qty = Number(log.qty);
  if (!material) throw new Error('Select a raw material from inventory.');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Enter a valid wastage quantity.');
  if (qty > Number(material.currentStock)) throw new Error(`Only ${material.currentStock} ${material.unit} of ${material.name} is available.`);
  const id = log.id || inventoryId('WST');
  const savedLog = {
    ...log,
    id,
    date: log.date || new Date().toISOString().split('T')[0],
    material: material.name,
    unit: material.unit,
    qty,
    cost: Number((qty * Number(material.unitCost || 0)).toFixed(2)),
    loggedBy: log.loggedBy || 'Chef / Staff',
  };
  adjustRawMaterialStock(material.id, qty, 'subtract', `Kitchen Wastage #${formatRecordId(id)} (${savedLog.reason})`);
  const updated = [savedLog, ...list];
  setStored('tbk_wastage', updated);
  syncDocToFirestore('wastage', savedLog.id, savedLog);

  // Log audit event
  logAuditEvent({
    action: 'Kitchen Wastage Logged',
    user: savedLog.loggedBy,
    details: `Discarded ${savedLog.qty} ${savedLog.unit || 'kg'} of ${savedLog.material} (Cost: ₹${savedLog.cost}) - Reason: ${savedLog.reason}`,
    ip: 'Kitchen Terminal',
  });

  try {
    window.dispatchEvent(new CustomEvent('tbk_wastage_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deleteWastageLog(id) {
  const list = getWastageLogs();
  const updated = list.filter((w) => w.id !== id);
  setStored('tbk_wastage', updated);
  deleteDocFromFirestore('wastage', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_wastage_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

// ─── Discounts & Coupon Promotions API ────────────────────────
export function getPromotions() {
  return getStored('tbk_promotions', DEFAULT_PROMOTIONS);
}

export function savePromotion(promo) {
  const list = getPromotions();
  let savedPromo;
  let updated;
  if (promo.id && list.some((p) => p.id === promo.id)) {
    updated = list.map((p) => {
      if (p.id === promo.id) {
        savedPromo = {
          ...p,
          ...promo,
          code: (promo.code || p.code).toUpperCase().trim(),
          value: Number(promo.value) || 0,
          minBill: Number(promo.minBill) || 0,
          maxDiscount: Number(promo.maxDiscount) || 0,
        };
        return savedPromo;
      }
      return p;
    });
  } else {
    const id = promo.id || `PROMO-${String(list.length + 1).padStart(2, '0')}`;
    savedPromo = {
      ...promo,
      id,
      code: (promo.code || `CODE${list.length + 1}`).toUpperCase().trim(),
      value: Number(promo.value) || 10,
      minBill: Number(promo.minBill) || 0,
      maxDiscount: Number(promo.maxDiscount) || 500,
      status: promo.status || 'active',
      uses: Number(promo.uses) || 0,
    };
    updated = [...list, savedPromo];
  }
  setStored('tbk_promotions', updated);
  syncDocToFirestore('promotions', savedPromo.id, savedPromo);
  try {
    window.dispatchEvent(new CustomEvent('tbk_promotions_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function deletePromotion(id) {
  const list = getPromotions();
  const updated = list.filter((p) => p.id !== id);
  setStored('tbk_promotions', updated);
  deleteDocFromFirestore('promotions', id);
  try {
    window.dispatchEvent(new CustomEvent('tbk_promotions_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

// ─── Loyalty Program Tiers API ────────────────────────────────
export function getLoyaltyTiers() {
  return getStored('tbk_loyalty_tiers', DEFAULT_LOYALTY_TIERS);
}

export function saveLoyaltyTiers(tiers) {
  setStored('tbk_loyalty_tiers', tiers);
  syncDocToFirestore('settings', 'loyalty', { tiers, updatedAt: new Date().toISOString() });
  try {
    window.dispatchEvent(new CustomEvent('tbk_loyalty_tiers_updated', { detail: tiers }));
  } catch (e) { }
  return tiers;
}

// ─── System Security & Action Audit Logs API ──────────────────
export function getAuditLogs() {
  return getStored('tbk_audit_logs', DEFAULT_AUDIT_LOGS);
}

export function logAuditEvent(event) {
  const list = getAuditLogs();
  const id = `LOG-${Math.floor(8800 + Math.random() * 1200)}`;
  const newEntry = {
    id,
    timestamp: new Date().toISOString(),
    user: event.user || 'System Auto',
    action: event.action || 'General Event',
    details: event.details || '',
    ip: event.ip || '192.168.1.10 (POS)',
  };
  const updated = [newEntry, ...list.slice(0, 200)]; // Retain up to 200 recent events
  setStored('tbk_audit_logs', updated);
  syncDocToFirestore('audit_logs', newEntry.id, newEntry);
  try {
    window.dispatchEvent(new CustomEvent('tbk_audit_logs_updated', { detail: updated }));
  } catch (e) { }
  return updated;
}

export function clearAuditLogs() {
  setStored('tbk_audit_logs', []);
  try {
    window.dispatchEvent(new CustomEvent('tbk_audit_logs_updated', { detail: [] }));
  } catch (e) { }
  return [];
}
