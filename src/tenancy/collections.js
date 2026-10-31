// All business collections are scoped, including modules reserved for later release.
export const RESTAURANT_COLLECTIONS = Object.freeze([
  'menu_items', 'categories', 'combos', 'modifiers', 'recipes', 'recipe_drafts',
  'raw_materials', 'utensils', 'orders', 'takeaway_requests', 'tables', 'staff', 'branches', 'users',
  'suppliers', 'supply_categories', 'kitchen_stations', 'purchase_bills', 'purchase_orders',
  'stock_movements', 'wastage', 'promotions', 'kots', 'printers', 'print_routing', 'print_queue',
  'audit_logs', 'customers', 'reservations', 'waitlist', 'leaves', 'advances', 'attendance',
  'cash_transactions', 'expenses', 'day_close', 'shifts', 'inbox', 'inbox_messages', 'cash_drawer',
  'finance_entries', 'finance_registers', 'settings', 'public_settings',
]);
export function scopedCollectionName(name) {
  if (!RESTAURANT_COLLECTIONS.includes(name) && name !== 'members') throw new Error(`Unknown restaurant collection: ${name}`);
  return name === 'users' ? 'members' : name;
}
