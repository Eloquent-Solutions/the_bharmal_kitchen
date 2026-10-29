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
### Finance register records

The finance release uses one `finance_registers/main` document containing the active shift ID, business date, last closed date, and revision. Financial transactions read this document and their active `shifts` record together; payment and shift-close races therefore retry or reject rather than losing a receipt.

`shifts` schema version 2 records opening cash, cash/UPI collections, cash transfers, cash expenses, supplier cash payments, physical closing cash, variance, and responsible user. Closed records are immutable. `finance_entries` stores immutable payment/expense/transfer events with deterministic references for bill and supplier payment retries. `expenses` records overhead; an active-shift reversal retains the original plus a reversal entry. `day_close/{YYYY-MM-DD}` stores an immutable summary after register shifts close.

Orders save `businessDate`, `shiftId`, and per-line/total ingredient cost snapshots with completeness flags. Payments save their own `paymentBusinessDate`, `paymentShiftId`, and `paymentEntryId`, so an older bill can be collected on a later day. All business dates use Asia/Kolkata. No historical costs or tax rates are guessed during report generation.
