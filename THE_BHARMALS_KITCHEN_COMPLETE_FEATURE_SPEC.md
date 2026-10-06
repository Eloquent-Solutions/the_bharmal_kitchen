# THE BHARMALS KITCHEN — COMPLETE RESTAURANT MANAGEMENT SYSTEM

## Production-Grade Master Feature & Project Specification

**Project:** The Bharmals Kitchen Restaurant Management System  
**Frontend:** JavaScript + React + Vite  
**Backend:** Firebase  
**Hosting:** Vercel  
**Database:** Cloud Firestore  
**Authentication:** Firebase Authentication  
**Storage:** Firebase Storage  
**Currency:** INR (₹)  
**Timezone:** Asia/Kolkata  
**Design:** Premium, sophisticated, responsive glassmorphism

---

## 1. OBJECTIVE

Build a production-grade restaurant management platform for **The Bharmals Kitchen**, combining:

- POS and billing
- Thermal printing
- Custom thermal receipt designer
- Printer management and routing
- KOT and KDS
- Chef mobile interface
- Tables and floor management
- Reservations and waitlist
- Menu, modifiers and combos
- Recipes and raw-material inventory
- Automatic ingredient deduction
- Dish availability calculation
- Purchasing and suppliers
- Batch/expiry and wastage
- Customer CRM and loyalty
- Discounts and promotions
- Payments, refunds and split payments
- Cash drawer, shifts and day closing
- Staff, attendance, leave and payroll
- Staff advances and cash expenses
- Restaurant expenses
- GST/tax-ready architecture
- Analytics and profitability
- PDF/Excel/CSV exports
- QR digital menu and table ordering
- Online-order integration architecture
- Notifications
- Audit history
- Role-based access control
- Real-time multi-device synchronization
- Offline-first capabilities where practical
- Multi-branch-ready architecture
- Firebase security
- Full project documentation

This must be a real application, not a static prototype.

---

# 2. NON-NEGOTIABLE RULES

### Production quality

Do not create:

- Fake buttons
- Empty screens
- Static mock-only workflows
- Fake printer connections
- Fake Wi-Fi discovery
- Fake payments
- Fake notifications
- Fake stock calculations
- Placeholder core functionality
- Hard-coded rules that should be configurable

Every important action must either work or clearly state why an external integration is required.

### Staged implementation

Build in phases while keeping the application runnable:

1. Foundation
2. Security
3. Master data
4. POS/order engine
5. Kitchen
6. Inventory/recipes
7. Billing/printing
8. Staff/finance
9. Analytics
10. Advanced integrations
11. Production hardening

---

# 3. DOCUMENTATION REQUIREMENT

Create and maintain:

```text
README.md
PROJECT_PLAN.md
ARCHITECTURE.md
DATA_MODEL.md
UI_UX_SPEC.md
SECURITY.md
THERMAL_PRINTING.md
PRINTER_ARCHITECTURE.md
TESTING.md
DECISIONS.md
PROGRESS.md
CHANGELOG.md
```

Update `PROGRESS.md` and `CHANGELOG.md` after meaningful implementation work.

Record architecture decisions in `DECISIONS.md`.

---

# 4. BRANDING

Restaurant name:

**The Bharmals Kitchen**

Restaurant profile should support:

- Logo
- Name
- Address
- Phone
- Email
- GSTIN
- FSSAI/license information where required
- Website
- Social links
- Tax configuration
- Currency
- Timezone
- Receipt footer
- Terms and conditions

Use the restaurant identity consistently in POS, receipts, KOT, reports, PDFs and customer-facing pages.

---

# 5. TECHNICAL ARCHITECTURE

## Frontend

Use:

- React
- JavaScript
- Vite
- React Router
- Reusable components
- Form validation
- Responsive UI
- Accessibility
- Error boundaries
- Lazy loading where useful

Suggested structure:

```text
src/
  app/
  components/
  layouts/
  pages/
  features/
  hooks/
  services/
  firebase/
  utils/
  validators/
  printers/
  notifications/
  reports/
  offline/
  styles/
  constants/
```

## Firebase

Use:

- Firebase Authentication
- Firestore
- Firebase Storage
- Cloud Functions where appropriate
- Firebase Cloud Messaging where supported
- Firebase App Check where appropriate

Never expose private secrets in frontend code.

## Deployment

Deploy through Vercel.

Use environment variables for Firebase and external integrations.

---

# 6. DESIGN SYSTEM

Create a premium restaurant-management UI:

- Sophisticated glassmorphism
- Clean cards
- Subtle blur
- Professional typography
- Strong readability
- Modern icons
- Responsive layouts
- Smooth but restrained transitions
- Clear status indicators

Support:

- Desktop
- Laptop
- Tablet
- Chef mobile
- Staff mobile
- Customer mobile

Chef screens must use large touch targets and simplified workflows.

---

# 7. APPLICATION SHELL

Create:

- Sidebar
- Top navigation
- Restaurant/branch selector
- User profile
- Notification center
- Global search
- Quick actions
- Breadcrumbs
- Responsive mobile navigation
- Theme support

Global search should cover:

- Orders
- Customers
- Menu
- Raw materials
- Suppliers
- Staff
- Bills
- Tables
- Reservations
- Purchases

---

# 8. AUTHENTICATION

Support:

- Email/password
- Password reset
- Session management
- Optional phone authentication architecture

Authentication states:

```text
Logged Out
Logging In
Authenticated
Session Expired
Unauthorized
Account Disabled
```

Protect all application routes.

---

# 9. ROLE-BASED ACCESS CONTROL

Roles:

- Owner
- Admin
- Manager
- Cashier
- Chef
- Kitchen Staff
- Waiter
- Inventory Manager
- Accountant
- Staff

Permissions should be configurable.

Examples:

```text
view_dashboard
create_order
edit_order
cancel_order
apply_discount
override_price
refund_order
manage_menu
manage_recipe
manage_inventory
adjust_stock
manage_purchase
manage_supplier
manage_staff
manage_attendance
manage_salary
view_reports
export_reports
manage_settings
manage_printers
manage_users
view_audit_logs
close_day
```

Sensitive actions should support manager/owner approval.

---

# 10. DASHBOARD

Show:

- Today's sales
- Today's orders
- Average order value
- Open orders
- Pending kitchen orders
- Completed orders
- Cancelled orders
- Refunds
- Discounts
- Food cost
- Estimated gross profit
- Staff cost
- Expenses
- Operating result
- Low stock
- Out-of-stock items
- Reservations
- Table occupancy
- Cash balance
- Supplier dues
- Staff attendance

Charts:

- Hourly sales
- Daily/weekly/monthly sales
- Category sales
- Top items
- Low-performing items
- Payment methods
- Order channels
- Food-cost trend
- Wastage trend
- Purchase trend

---

# 11. POS / ORDER ENGINE

Support:

- Dine-in
- Takeaway
- Pickup
- Delivery
- Online orders
- Other configurable channels

Order lifecycle:

```text
Draft
→ Confirmed
→ KOT Sent
→ Preparing
→ Ready
→ Served/Packed
→ Billed
→ Paid
→ Completed
```

Alternative:

```text
Cancelled
Refunded
Partially Refunded
On Hold
```

Every important state transition must be auditable.

POS features:

- Category navigation
- Item search
- SKU/barcode search
- Item cards
- Modifiers
- Add-ons
- Variants
- Combos
- Quantity
- Notes
- Kitchen notes
- Item discount
- Order discount
- Taxes
- Service charge
- Packaging charge
- Delivery charge
- Customer
- Table
- Waiter
- Order type
- Token

---

# 12. CART

Support:

- Add/remove item
- Quantity
- Modifier editing
- Item notes
- Kitchen notes
- Item-level discounts
- Order-level discounts
- Tax
- Charges
- Round-off
- Customer details
- Payment status

Use transaction-safe operations.

---

# 13. TOKEN MANAGEMENT

Support:

- Daily reset
- Configurable prefix
- Starting number
- Multiple counters
- Collision-safe generation
- Token on KOT
- Token on KDS
- Token on receipt
- Token search

Generate tokens using Firestore transaction-safe logic.

---

# 14. MENU MANAGEMENT

Menu item fields:

```text
name
shortName
description
category
subcategory
SKU
barcode
price
tax
cost
image
foodType
preparationTime
station
availability
displayOrder
isActive
isFeatured
```

Support:

- Add
- Edit
- Soft delete
- Search
- Filter
- Sort
- Duplicate
- Bulk import
- Bulk export

---

# 15. CATEGORIES, MODIFIERS AND COMBOS

Categories:

- Main categories
- Subcategories
- Ordering
- Images
- Active/inactive
- Time-based visibility

Modifiers:

- Required/optional groups
- Minimum/maximum selection
- Additional price
- Recipe impact

Combos:

- Multiple items
- Quantity rules
- Combo pricing
- Discounts
- Recipe consumption
- Availability

---

# 16. TABLE AND FLOOR MANAGEMENT

Create a visual floor plan.

Support:

- Floors
- Areas/sections
- Tables
- Capacity
- Status
- Merge tables
- Split tables
- Transfer order
- Reservation
- Cleaning status

Statuses:

```text
Available
Occupied
Reserved
Cleaning
Blocked
```

---

# 17. RESERVATIONS AND WAITLIST

Reservations:

- Customer
- Date/time
- Party size
- Table
- Status
- Notes
- Special requests
- Deposit
- Confirmation
- Cancellation
- No-show

Statuses:

```text
Pending
Confirmed
Arrived
Seated
Completed
Cancelled
No-show
```

Waitlist:

- Customer
- Phone
- Party size
- Waiting time
- Preferred area
- Estimated wait
- Table assignment
- Availability notification

---

# 18. KOT

Generate KOT from confirmed orders.

Include:

- Token
- Order number
- Table
- Order type
- Items
- Quantity
- Modifiers
- Notes
- Timestamp
- Station
- Priority

Support:

- New KOT
- Modified KOT
- Cancel KOT
- Reprint KOT
- Station routing

---

# 19. KDS / CHEF MOBILE

KDS columns:

```text
New
Preparing
Ready
Completed
```

Features:

- Real-time updates
- Item/order timers
- Priority
- Station filters
- Sound notifications
- Bump
- Recall
- Long-wait warning

Chef mobile:

1. PC creates order.
2. Firestore updates.
3. Chef receives order in real time.
4. Notification and sound play.
5. Chef starts preparation.
6. Chef marks ready/completed.
7. POS receives real-time update.
8. PC notification/sound plays.

Sound manager:

- New order
- Ready
- Priority
- Error
- Volume
- Mute
- Snooze
- Per-device settings

Use browser/mobile notifications where supported.

---

# 20. ORDER HISTORY

Filters:

- Date
- Order number
- Token
- Customer
- Table
- Staff
- Payment method
- Order type
- Status
- Amount

Actions:

- View
- Reprint
- Download
- Export
- Refund
- Duplicate
- Audit history

Do not casually delete completed financial records.

---

# 21. BILLING AND PAYMENTS

Support:

- Tax
- Discounts
- Charges
- Round-off
- Multiple payment methods
- Split payments
- Partial payments
- Refunds
- Receipt printing
- Invoice printing

Payment methods:

```text
Cash
UPI
Card
Bank Transfer
Other
```

Payment record:

```text
paymentId
orderId
amount
method
status
reference
timestamp
```

---

# 22. SPLIT PAYMENTS

Support:

- Equal split
- Item split
- Custom amount
- Multiple payment methods
- Partial payment
- Remaining balance

All calculations must be transaction-safe.

---

# 23. REFUNDS AND CANCELLATIONS

Support:

- Full refund
- Partial refund
- Item cancellation
- Order cancellation
- Reason
- Manager approval
- Payment reversal status
- Inventory reversal where appropriate

Never silently alter completed financial records.

---

# 24. CASH DRAWER, SHIFTS AND DAY CLOSING

Cash drawer:

- Opening cash
- Cash sales
- Cash expenses
- Cash refunds
- Adjustments
- Expected cash
- Actual cash
- Difference

Shifts:

- Open
- Close
- Staff assignment
- Opening/closing balance
- Payment summary
- Variance

Day closing:

- Open orders check
- Sales summary
- Payment summary
- Cash reconciliation
- Refunds
- Discounts
- Taxes
- Purchases
- Expenses
- Staff cost
- Food cost
- Wastage
- Variance
- Closing cash

Historical changes after day close require authorized access.

---

# 25. THERMAL RECEIPT PRINTING

Support:

- 58mm
- 80mm

Document types:

- Customer receipt
- Tax invoice
- KOT
- Kitchen ticket
- Bar ticket
- Pickup ticket
- Delivery ticket
- Refund receipt
- Payment receipt

---

# 26. CUSTOM THERMAL RECEIPT DESIGNER

Create a visual drag-and-drop web designer.

Features:

- Drag/drop
- Resize
- Reorder
- Alignment
- Snap-to-grid
- Layers
- Lock
- Duplicate
- Delete
- Undo
- Redo
- Zoom
- Preview
- Test print
- Save
- Duplicate
- Version templates
- Set default

Elements:

```text
Logo
Restaurant Name
Address
Phone
GSTIN
Date
Time
Invoice Number
Token
Table
Customer
Waiter
Items
Quantity
Rate
Amount
Discount
Tax
Charges
Payment
Total
QR
Barcode
Custom Text
Divider
Spacer
Footer
Terms
```

Dynamic variables:

```text
{{restaurant.name}}
{{order.number}}
{{order.token}}
{{order.date}}
{{order.time}}
{{customer.name}}
{{customer.phone}}
{{table.number}}
{{items}}
{{subtotal}}
{{discount}}
{{tax}}
{{grandTotal}}
{{payment.method}}
{{payment.amount}}
```

Support actual order-data preview.

---

# 27. THERMAL FONTS

Support:

- Printer-native fonts
- Custom web fonts in preview
- Font size
- Bold
- Underline
- Alignment
- Wrapping

If a printer cannot natively use a custom font, rasterize text/graphics when appropriate.

Do not claim arbitrary TTF/OTF support on every thermal printer.

---

# 28. PRINTER ARCHITECTURE

Use:

```text
PrinterManager
    |
    +-- NetworkPrinterDriver
    +-- WebUSBPrinterDriver
    +-- WebSerialPrinterDriver
    +-- WebBluetoothPrinterDriver
    +-- SystemPrintDriver
    +-- PrintBridgeDriver
```

Common interface:

```text
connect()
disconnect()
test()
print()
getStatus()
```

Detect capabilities before enabling unsupported operations.

---

# 29. PRINTER CONNECTIONS

## USB

Use where supported:

- WebUSB
- WebSerial
- Local print bridge

## Wi-Fi/LAN

Support:

- IP
- Hostname
- Port
- Network protocol
- ESC/POS
- Print bridge

A normal browser cannot universally scan a local Wi-Fi network or open arbitrary TCP sockets. Provide manual IP/hostname configuration or a local print bridge.

## Bluetooth

Support compatible Web Bluetooth where available.

Clearly distinguish:

- BLE/Web Bluetooth
- Bluetooth Classic/SPP

Do not claim universal Bluetooth Classic browser support.

## System printer

Support:

- Browser print dialog
- OS printer
- PDF/system printing fallback

---

# 30. PRINTER SELECTION

Create a device-selection UI showing:

- Printer name
- Connection type
- IP/port where applicable
- Device ID
- Paper width
- Assigned station
- Default
- Connection status
- Last successful print
- Test
- Reconnect
- Diagnostics

Do not fake universal Wi-Fi discovery.

---

# 31. PRINTER ROUTING

Example:

```text
Customer Receipt → Counter Printer
KOT → Kitchen Printer
Bar KOT → Bar Printer
Pickup → Pickup Printer
Delivery → Delivery Printer
```

Support:

- Printer groups
- Station mapping
- Order-type mapping
- Category mapping
- Item mapping
- Fallback printer
- Manual override

---

# 32. PRINT QUEUE AND DIAGNOSTICS

Print job:

```text
jobId
orderId
printerId
templateId
documentType
createdAt
status
attemptCount
error
```

Statuses:

```text
Queued
Printing
Printed
Failed
Cancelled
Retrying
```

Use idempotent print-job IDs to prevent duplicates.

Diagnostics:

- Test print
- Connection test
- Capability test
- Paper width
- ESC/POS compatibility
- Error logs
- Last successful print
- Queue status

Only report hardware status when the protocol actually exposes it.

---

# 33. KOT DESIGNER

Create a designer similar to receipt designer.

Support:

- Logo
- Restaurant name
- Token
- Table
- Items
- Modifiers
- Notes
- Priority
- Timestamp
- Station
- Footer

---

# 34. RAW MATERIAL INVENTORY

Support:

- Add
- Edit
- Soft delete
- Search
- Filter
- Categories
- Units
- Base units
- Conversion units
- Current stock
- Minimum stock
- Maximum stock
- Reorder level
- Purchase cost
- Supplier
- Expiry
- Batch
- Storage location

---

# 35. UNIT MANAGEMENT

Support:

- Piece
- Count
- Gram
- Kilogram
- Millilitre
- Litre
- Box
- Packet
- Bottle
- Custom units

Conversions:

```text
1 kg = 1000 g
1 L = 1000 ml
```

Reject incompatible conversions.

---

# 36. RECIPE MANAGEMENT

Example:

```text
Burger
  Bun       1 piece
  Patty     1 piece
  Cheese    20 g
  Sauce     15 ml
```

Support:

- Ingredients
- Quantity
- Unit
- Yield
- Waste percentage
- Preparation loss
- Packaging
- Recipe versions
- Recipe cost

---

# 37. DISH AVAILABILITY CALCULATION

Calculate availability from the limiting ingredient.

Example:

```text
Buns = 10
Patties = 20
Cheese = 30 portions
Sauce = 50 portions

Burger availability = min(10,20,30,50) = 10
```

Show:

```text
Available: 10 Burgers
```

---

# 38. STOCK RESERVATION AND DEDUCTION

Prevent overselling.

If 10 burgers are available and one open order reserves 5:

```text
Available = 5
```

A second order for 6 should be blocked or warned according to configurable negative-stock policy.

Recommended default:

```text
Draft → no deduction
Confirmed/KOT → reserve/deduct
Cancelled → reverse
Refund → reverse where applicable
```

Every stock movement creates a ledger entry.

---

# 39. STOCK LEDGER

Track:

```text
Opening
Purchase
Consumption
Wastage
Adjustment
Transfer
Return
Refund reversal
Closing
```

Never overwrite historical movements.

---

# 40. PURCHASING

Support:

- Purchase bills
- Suppliers
- Purchase orders
- Goods receiving
- Purchase returns
- Purchase history
- Invoice number
- Purchase date
- Quantity
- Unit cost
- Tax
- Total
- Payment status
- Due amount

---

# 41. SUPPLIERS

Fields:

- Name
- Phone
- Email
- Address
- GSTIN
- Contact person
- Payment terms
- Credit limit
- Outstanding
- Purchase history

Reports:

- Purchases
- Outstanding
- Payment history
- Price trends

---

# 42. BATCH / EXPIRY

Track:

- Batch number
- Manufacturing date
- Expiry
- Purchase date
- Quantity
- Cost

Alerts:

- Expiring soon
- Expired
- Low stock

Support FIFO/FEFO where appropriate.

---

# 43. STOCK COUNT

Workflow:

```text
Create Count
→ Enter Physical Quantity
→ Compare System Quantity
→ Show Variance
→ Manager Approval
→ Adjustment
```

---

# 44. WASTAGE

Record:

- Ingredient
- Quantity
- Unit
- Reason
- Cost
- Staff
- Date
- Notes
- Approval

Reasons:

- Spoilage
- Expired
- Burnt
- Preparation loss
- Spillage
- Damaged
- Other

---

# 45. UTENSILS / ASSET STOCK

Support:

- Add
- Edit
- Soft delete
- Search
- Category
- Quantity
- Purchase price
- Purchase date
- Supplier
- Condition
- Location

Examples:

- Plates
- Glasses
- Spoons
- Forks
- Trays
- Cooking utensils

---

# 46. MENU AVAILABILITY ENGINE

Statuses:

```text
Available
Low Availability
Out of Stock
Temporarily Unavailable
```

Consider:

- Ingredients
- Recipe quantity
- Reserved stock
- Manual disable
- Time schedule

POS should prevent unavailable items unless override permission exists.

---

# 47. CUSTOMER CRM

Customer profile:

- Name
- Phone
- Email
- Birthday
- Notes
- Order history
- Total spending
- Visit count
- Average order value
- Loyalty points
- Preferred items
- Last visit

---

# 48. LOYALTY, COUPONS AND PROMOTIONS

Loyalty:

- Points
- Earn rules
- Redeem rules
- Expiry
- Bonus points
- Manual adjustments
- Customer tiers

Coupons/promotions:

- Percentage
- Flat
- Item
- Category
- BOGO
- Minimum order
- Time-based
- Day-based
- Customer-specific
- Coupon code
- Usage limit
- Start/end dates

---

# 49. QR DIGITAL MENU

Mobile-first customer menu:

- Categories
- Images
- Descriptions
- Prices
- Modifiers
- Availability
- Restaurant information
- Bilingual-ready architecture

---

# 50. QR TABLE ORDERING

Table-specific QR may contain:

```text
restaurantId
branchId
tableId
```

Flow:

```text
Scan QR
→ Browse
→ Select
→ Cart
→ Place Order
→ POS/KDS
```

---

# 51. ONLINE ORDER ARCHITECTURE

Prepare adapters for:

- Website
- QR ordering
- Delivery aggregators
- Pickup
- Future external channels

Use:

```text
OrderChannelAdapter
PaymentAdapter
NotificationAdapter
```

Do not invent unsupported third-party integrations.

---

# 52. STAFF MANAGEMENT

Staff fields:

```text
name
phone
email
role
joiningDate
salaryType
salaryAmount
status
address
emergencyContact
bankDetails
```

Sensitive data requires strict access control.

---

# 53. ATTENDANCE

Support:

- Full-day present
- Half-day present
- Absent
- Leave
- Late
- Early departure
- Check-in
- Check-out

Monthly reports.

---

# 54. LEAVE MANAGEMENT

Support:

- Full-day leave
- Half-day leave
- Reason
- Request
- Approval
- Rejection
- Leave balance where configured

---

# 55. SALARY / PAYROLL

Salary types:

- Monthly
- Daily wage
- Hourly
- Custom

Calculation:

```text
Base Salary
+ Overtime
+ Incentives
- Absence deductions
- Advances
- Other deductions
= Net Salary
```

Rules must be configurable and should not hard-code legal assumptions.

---

# 56. STAFF ADVANCES / CASH PAYMENTS

Record:

```text
Staff
Date
Amount
Payment method
Reason
Notes
```

Example:

```text
Gross Salary
- Staff Advance
= Remaining Salary
```

Show complete advance history.

---

# 57. STAFF INCENTIVES

Support:

- Sales incentive
- Attendance incentive
- Performance incentive
- Custom incentive

Rules must be configurable.

---

# 58. EXPENSE MANAGEMENT

Categories:

- Rent
- Electricity
- Gas
- Water
- Internet
- Maintenance
- Cleaning
- Transport
- Marketing
- Salary
- Repairs
- Miscellaneous

Fields:

```text
amount
category
date
paymentMethod
vendor
notes
attachment
approvedBy
```

---

# 59. ACCOUNTING-STYLE LEDGER

Track:

- Sales
- Purchases
- Expenses
- Supplier dues
- Staff advances
- Payroll
- Cash
- Refunds
- Discounts
- Taxes

Clearly label this as operational accounting unless an actual accounting integration is provided.

---

# 60. GST / TAX-READY

Support configurable:

- Tax rates
- Inclusive/exclusive pricing
- CGST
- SGST
- IGST
- HSN/SAC
- GSTIN
- Invoice numbering
- Financial year
- Tax reports

Do not hard-code changing legal rules.

---

# 61. REPORTS

### Sales

- Daily
- Weekly
- Monthly
- Custom date
- Item
- Category
- Channel
- Payment method

### Orders

- Total
- Completed
- Cancelled
- Refunded
- Average order value

### Products

- Top-selling
- Low-selling
- Item contribution
- Category contribution

### Inventory

- Current stock
- Low stock
- Stock movement
- Valuation
- Consumption
- Wastage
- Variance

### Food cost

- Recipe cost
- Actual consumption
- Theoretical consumption
- Food-cost percentage
- Wastage cost

### Staff

- Attendance
- Salary
- Advances
- Incentives
- Staff cost

### Suppliers

- Purchases
- Outstanding
- Purchase trends

### Finance

- Revenue
- Expenses
- Refunds
- Discounts
- Tax
- Gross contribution
- Operating result

---

# 62. PROFIT ANALYTICS

Support configurable calculations:

```text
Revenue
- Discounts
- Refunds
= Net Sales

Net Sales
- Ingredient Cost
- Packaging Cost
= Gross Contribution

Gross Contribution
- Staff Cost
- Rent
- Utilities
- Other Expenses
= Operating Result
```

Clearly distinguish estimated values from actual accounting figures.

---

# 63. EXPORTS

Support:

- PDF
- Excel/XLSX
- CSV

Export:

- Orders
- Sales
- Inventory
- Purchases
- Staff
- Attendance
- Salary
- Expenses
- Customers
- Tax reports

---

# 64. PDF / INVOICE

Generate professional:

- A4 invoices
- Thermal receipts
- Customer statements
- Reports

Include:

- Restaurant information
- Customer information
- Tax
- Payment
- QR/barcode
- Footer

---

# 65. SHARING / WHATSAPP

Support:

- Web Share API where available
- Download PDF
- Share invoice
- Copy invoice link
- WhatsApp click-to-chat

Do not claim automated WhatsApp sending without an official API integration.

---

# 66. NOTIFICATION CENTER

Events:

- New order
- Kitchen ready
- Low stock
- Out of stock
- Reservation
- Payment
- Refund
- Leave
- Attendance
- Supplier due
- Expiry
- Printer failure
- Day closing

Support read/unread, priority and timestamps.

---

# 67. OFFLINE-FIRST

Where practical support:

- Cached menu
- Cached settings
- Draft orders
- Local order queue
- Reconnect sync
- Conflict resolution

Every offline operation needs a unique idempotency ID.

Never duplicate transactions during reconnect.

---

# 68. REAL-TIME SYNC

Use Firestore listeners where appropriate.

Example:

```text
PC POS
  ↓
Firestore
  ↓
Chef Mobile

Chef
  ↓
Firestore
  ↓
POS
```

Inventory and order state must synchronize across authorized devices.

Avoid unnecessary listeners to control Firebase cost.

---

# 69. MULTI-BRANCH READY

Structure:

```text
Organization
  └── Branch
      ├── Users
      ├── Tables
      ├── Orders
      ├── Inventory
      ├── Printers
      ├── Staff
      └── Reports
```

Branch-sensitive data must reference the correct organization and branch.

---

# 70. AUDIT LOG

Track:

```text
userId
action
entityType
entityId
before
after
timestamp
device
reason
```

Track:

- Price changes
- Discounts
- Refunds
- Cancellations
- Stock adjustments
- Recipe changes
- Salary changes
- Attendance corrections
- Permission changes
- Printer changes
- Day closing

Normal users cannot delete audit records.

---

# 71. DATA INTEGRITY

Use:

- Firestore transactions
- Server timestamps
- Unique IDs
- Idempotency
- Validation
- Permission checks
- Immutable financial records where appropriate
- Soft deletion for master data

Important operations must be atomic.

---

# 72. FIRESTORE DATA MODEL

Suggested collections:

```text
organizations
branches
users
roles
permissions
categories
menuItems
modifierGroups
modifiers
combos
tables
floors
reservations
waitlist
orders
orderItems
payments
refunds
kotTickets
kdsTickets
customers
loyaltyAccounts
coupons
rawMaterials
stockLots
stockMovements
recipes
recipeVersions
purchases
purchaseItems
purchaseOrders
suppliers
wastage
stockCounts
utensils
staff
attendance
leaveRequests
payroll
staffAdvances
incentives
expenses
cashDrawers
shifts
businessDays
printers
printerTemplates
printerRoutes
printJobs
notifications
auditLogs
settings
reports
```

Use subcollections where useful for ownership, security and scalability.

---

# 73. SECURITY

Implement:

- Firebase Auth
- Firestore rules
- Storage rules
- App Check where appropriate
- Least privilege
- Input validation
- Secure environment variables
- Audit logs
- Session handling
- Server-side authorization

Frontend permissions are for UX; Firebase/server rules must enforce access.

---

# 74. SEARCH

Search:

- Orders
- Menu
- Customers
- Inventory
- Suppliers
- Staff
- Reservations
- Purchases

Use indexed queries and pagination.

---

# 75. IMPORT / EXPORT

CSV/XLSX import for:

- Menu
- Raw materials
- Suppliers
- Staff
- Customers

Workflow:

```text
Upload
→ Parse
→ Validate
→ Preview
→ Show Errors
→ Confirm
→ Import
→ Result
```

Never silently import invalid records.

---

# 76. BACKUP / RECOVERY

Document a real backup strategy using supported Firebase/export mechanisms.

Provide:

- Backup documentation
- Export capability
- Recovery documentation
- Retention configuration

Do not call a simple browser export a complete disaster-recovery backup.

---

# 77. SETTINGS

Create:

### Restaurant

- Name
- Logo
- Address
- Contact
- GST
- Tax
- Footer

### POS

- Order defaults
- Token format
- Discount rules
- Negative-stock policy

### Inventory

- Units
- Thresholds
- Deduction event

### Kitchen

- Stations
- KDS
- Sounds

### Printer

- Printers
- Templates
- Routing
- Fallbacks

### Staff

- Attendance
- Salary
- Leave

### Notifications

- Browser notifications
- Sound
- Push
- Event preferences

### Security

- Users
- Roles
- Permissions
- Sessions

---

# 78. INTERNATIONALIZATION

Prepare architecture for:

- English
- Gujarati
- Hindi

Use translation keys instead of hard-coded UI strings.

Customer-facing menus should support bilingual content.

---

# 79. PERFORMANCE

Optimize:

- Firestore reads
- Image sizes
- Component rendering
- Large order lists
- Reports
- KDS listeners
- POS interaction speed

Use:

- Pagination
- Virtualized lists where useful
- Cached settings
- Aggregation documents where appropriate
- Efficient listeners

---

# 80. FIREBASE COST CONTROL

Avoid:

- Unnecessary listeners
- Full collection reads
- Unbounded queries
- Excessive document duplication

Use:

- Indexed queries
- Pagination
- Aggregation
- Caching
- Efficient subscriptions

---

# 81. TESTING

## Unit tests

Test:

- Tax
- Discounts
- Recipe cost
- Stock deduction
- Availability
- Salary
- Split payment
- Refund
- Token generation

## Integration tests

Test:

- Firebase
- Authentication
- Firestore
- Printer abstraction
- Notifications

## Security tests

Test:

- Firestore rules
- Role permissions
- Unauthorized access

## UI/E2E tests

Test:

- POS
- KDS
- Inventory
- Staff
- Reports
- Receipt designer

---

# 82. END-TO-END ACCEPTANCE TEST

The following must work:

```text
Login
↓
Open Business Day
↓
Create Menu
↓
Create Raw Materials
↓
Create Recipes
↓
Add Purchase
↓
Inventory Updates
↓
Dish Availability Calculates
↓
Create Table
↓
Create Customer
↓
Create Dine-in Order
↓
Token Generated
↓
Stock Reserved/Deducted
↓
KOT Generated
↓
Chef Receives Order
↓
Chef Starts Preparation
↓
Chef Marks Ready
↓
POS Receives Notification
↓
Generate Bill
↓
Split/Collect Payment
↓
Print Receipt
↓
Update Sales
↓
Update Stock
↓
Update Reports
↓
Close Shift
↓
Close Business Day
```

---

# 83. DEMO DATA

Provide optional seed data for development.

Demo data must be clearly marked and must never be mixed into production accidentally.

Provide safe demo reset functionality.

---

# 84. PROJECT PHASES

## Phase 1 — Foundation
React/Vite, Firebase, routing, design system, auth, roles, security, documentation.

## Phase 2 — Master Data
Restaurant, branch, categories, menu, modifiers, combos, tables, customers.

## Phase 3 — POS
Orders, cart, tokens, billing, payments, discounts, order lifecycle.

## Phase 4 — Kitchen
KOT, KDS, chef mobile, real-time updates, sounds.

## Phase 5 — Inventory
Raw materials, units, recipes, availability, stock ledger, purchases, suppliers, wastage, stock counts.

## Phase 6 — Printing
Printer manager, ESC/POS, receipt designer, KOT designer, routing, queue, diagnostics, print bridge.

## Phase 7 — Staff
Staff, attendance, leave, salary, advances, incentives.

## Phase 8 — Finance
Expenses, cash drawer, shifts, day close, tax-ready reports.

## Phase 9 — CRM
Customers, loyalty, coupons, promotions.

## Phase 10 — Digital Ordering
QR menu, QR ordering, online-order adapter architecture.

## Phase 11 — Analytics
Dashboard, sales, inventory, food cost, profitability, exports.

## Phase 12 — Production Hardening
Security, performance, offline testing, printer testing, error handling, recovery documentation, deployment and monitoring.

---

# 85. DOCUMENTATION CONTENT

### README.md
Project overview, setup, environment variables, Firebase, local development, build, deployment and printer setup.

### PROJECT_PLAN.md
Goals, architecture, phases, milestones, dependencies and acceptance criteria.

### ARCHITECTURE.md
Frontend, Firebase, state management, real-time, offline, printing and integrations.

### DATA_MODEL.md
Collections, fields, relationships, indexes and security.

### UI_UX_SPEC.md
Design system, pages, components, responsive behavior and chef UI.

### SECURITY.md
Authentication, authorization, rules, storage, App Check, secrets and audit.

### THERMAL_PRINTING.md
Browser APIs, limitations, print bridge, ESC/POS, fonts, QR/barcode and troubleshooting.

### PRINTER_ARCHITECTURE.md
Drivers, transport, routing, queue and diagnostics.

### TESTING.md
Unit, integration, E2E, security and printer tests.

### DECISIONS.md
Important architecture decisions and reasoning.

### PROGRESS.md
Track:

```text
Completed
In Progress
Blocked
Next
```

### CHANGELOG.md
Track features, fixes, breaking changes and architecture changes.

---

# 86. DEVELOPMENT WORKFLOW

For every major feature:

```text
Plan
↓
Define data model
↓
Define permissions
↓
Build backend logic
↓
Build UI
↓
Validation
↓
Error handling
↓
Tests
↓
Documentation
↓
Update PROGRESS.md
↓
Update CHANGELOG.md
```

Keep the application runnable after every major phase.

---

# 87. FEATURE COMPLETION CRITERIA

A major feature is complete only when:

- UI exists
- Data model exists
- Firebase logic exists
- Permissions exist
- Validation exists
- Error handling exists
- Loading/empty/error states exist
- Relevant tests exist
- Documentation exists
- Audit behavior exists where required
- Real-time sync works where required
- Mobile responsiveness works where relevant

---

# 88. HARDWARE HONESTY

Never promise:

- Universal Wi-Fi printer discovery
- Universal Bluetooth Classic printing
- Universal USB printing
- Universal paper-status detection
- Universal custom-font support

Use appropriate combinations of:

- WebUSB
- WebSerial
- Web Bluetooth
- System print
- Local print bridge
- Native/helper application
- Network printer APIs where supported

The UI must clearly show which method each printer uses.

---

# 89. FINAL PRODUCT STANDARD

The final application must feel like a serious commercial restaurant management platform.

It must be:

- Fast
- Reliable
- Secure
- Responsive
- Maintainable
- Scalable
- Real-time
- Printer-aware
- Inventory-aware
- Kitchen-aware
- Finance-aware
- Staff-aware
- Analytics-driven

The system must understand the relationship:

```text
MENU
  ↓
RECIPE
  ↓
RAW MATERIAL
  ↓
STOCK
  ↓
DISH AVAILABILITY
  ↓
ORDER
  ↓
KOT
  ↓
KITCHEN
  ↓
BILL
  ↓
PAYMENT
  ↓
PRINT
  ↓
SALES
  ↓
INVENTORY CONSUMPTION
  ↓
FOOD COST
  ↓
PROFIT
  ↓
REPORTING
```

And:

```text
STAFF
  ↓
ATTENDANCE
  ↓
SALARY
  ↓
ADVANCE
  ↓
EXPENSE
  ↓
PROFITABILITY
```

And:

```text
ORDER
  ↓
CUSTOMER
  ↓
LOYALTY
  ↓
PROMOTION
  ↓
REPEAT BUSINESS
```

---

# 90. FINAL AI CODING-AGENT INSTRUCTION

Act as a senior full-stack engineer, restaurant POS architect, Firebase architect, UI/UX engineer, inventory-system designer, thermal-printing engineer and QA engineer.

Build **The Bharmals Kitchen Restaurant Management System** according to this specification.

Do not omit necessary restaurant-management functionality simply because a feature was not explicitly repeated in an individual task.

When a feature depends on hardware or a third-party service:

1. Build the correct abstraction.
2. Implement supported functionality.
3. Document limitations.
4. Provide a practical fallback.
5. Never fake the integration.

When a feature is legally or tax sensitive:

1. Make it configurable.
2. Avoid hard-coded legal assumptions.
3. Distinguish software calculations from official accounting/legal compliance.

When a feature is too large for one implementation step:

1. Create the architecture.
2. Implement the core workflow.
3. Test it.
4. Document it.
5. Continue in the next phase.

Always keep the application runnable.

Always maintain:

```text
PROJECT_PLAN.md
PROGRESS.md
CHANGELOG.md
DECISIONS.md
```

The final result must be a real, maintainable, production-oriented restaurant management platform for **The Bharmals Kitchen**, not a visual prototype.
