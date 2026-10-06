# Data Model & Schema Specifications
## The Bharmals Kitchen — Firestore Schema Reference

### 1. `orders`
```typescript
interface Order {
  id: string;               // e.g. "TBK-1042"
  orderNumber: number;      // 1042
  branchId: string;         // "branch_mumbai_01"
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;         // e.g. "T-04"
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  items: Array<{
    itemId: string;
    name: string;
    qty: number;
    price: number;
    selectedModifiers?: Array<{ name: string; price: number }>;
    notes?: string;
  }>;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  serviceCharge: number;
  roundOffAmount: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'upi';
  status: 'received' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2. `kots` (Kitchen Order Tickets)
```typescript
interface KOT {
  id: string;               // e.g. "KOT-801"
  orderId: string;          // "TBK-1042"
  branchId: string;
  tableId?: string;
  station: 'Tandoor' | 'Curry / Biryani' | 'Desserts & Beverages';
  items: Array<{
    id: number;
    name: string;
    qty: number;
    notes?: string;
    done: boolean;
  }>;
  status: 'active' | 'completed';
  createdAt: Timestamp;
}
```

### 3. `menu_items`
```typescript
interface MenuItem {
  id: string;               // e.g. "ITEM-01"
  name: string;
  category: string;
  price: number;
  costPrice: number;
  type: 'veg' | 'non-veg' | 'vegan';
  station: string;
  prepTime: number;         // in minutes
  isAvailable: boolean;     // 86 indicator
  isSpecial: boolean;
  description: string;
}
```

### 4. `inventory_raw_materials`
```typescript
interface RawMaterial {
  id: string;               // e.g. "RM-101"
  name: string;
  category: string;
  currentStock: number;
  unit: 'kg' | 'gms' | 'ltr' | 'pcs';
  reorderLevel: number;
  unitCost: number;
  supplier: string;
  updatedAt: Timestamp;
}
```

### 5. `tables`
```typescript
interface Table {
  id: string;               // e.g. "T-01"
  name: string;
  section: 'Main Dining' | 'Family Section' | 'Outdoor Terrace';
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'billed' | 'cleaning';
  currentOrderId?: string;
}
```
