# Thermal Printing & Receipt Designer Specifications
## The Bharmals Kitchen — Restaurant Management System (RMS)

### 1. Thermal Printing Overview
Thermal receipt printing is a core frontline workflow for restaurant speed and reliability. The system supports standard 80mm (3-inch / 48-column) and 58mm (2-inch / 32-column) thermal paper rolls using standard ESC/POS protocol instructions.

---

### 2. Supported Print Types

1. **Customer Bill / Tax Invoice**
   - Header with Logo, Business Name, Address, Contact, GSTIN, FSSAI License.
   - Order metadata: Order #, Table #, Date & Time, Cashier / Server name.
   - Itemized list: Qty, Item Description, Modifiers, Rate, Amount.
   - Tax Breakdown: Subtotal, Discounts, CGST (2.5%), SGST (2.5%), Service Charge, Round-off, Grand Total.
   - Footer: Custom gratitude message, QR Code for Google Review / Loyalty feedback, WiFi password.

2. **Kitchen Order Ticket (KOT)**
   - High-visibility header: Table # or Takeaway / Delivery tag, Order ID, Time.
   - Target Kitchen Station (Tandoor, Curry/Biryani, Beverage).
   - Distinct bold font for items and preparation notes (e.g. *Extra spicy*, *Less oil*).

3. **Settlement / Day Close Report (Z-Report)**
   - Shift summary, cash in drawer, UPI totals, credit card totals, voids/discounts sum.

---

### 3. ESC/POS Command Integration Patterns

```typescript
// Standard ESC/POS Command sequences
export const ESC_POS_COMMANDS = {
  INIT: '\x1B\x40',             // Initialize printer
  ALIGN_LEFT: '\x1B\x61\x00',    // Left align
  ALIGN_CENTER: '\x1B\x61\x01',  // Center align
  ALIGN_RIGHT: '\x1B\x61\x02',   // Right align
  BOLD_ON: '\x1B\x45\x01',       // Bold font on
  BOLD_OFF: '\x1B\x45\x00',      // Bold font off
  DOUBLE_HEIGHT: '\x1B\x21\x10', // Double height
  DOUBLE_WIDTH: '\x1B\x21\x20',  // Double width
  FEED_AND_CUT: '\x1D\x56\x41\x03', // Feed paper and partial cut
  DRAWER_KICK: '\x1B\x70\x00\x19\xFA', // Open cash drawer pulse
};
```
