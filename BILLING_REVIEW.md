# Billing branch review

Branch: `codex/billing`. Production stays on the inventory-only release. The Production Vercel build rejects `VITE_BILLING_ENABLED=true` until billing is separately approved.

## Review locally or on a Vercel Preview

Use the **development** Firebase Web app values, `VITE_DATA_MODE=firebase`, `VITE_STAFF_ONLY=true`, `VITE_INVENTORY_ONLY=true`, and `VITE_BILLING_ENABLED=true`. A local `.env.local` can hold these values; for Vercel Preview, set them in the Preview environment only and redeploy. Add the Preview hostname under Firebase Authentication authorized domains if using Google sign-in.

An Owner, Admin, or Manager with POS and Orders tabs can review POS billing. The Manager role can update the stock ledger as part of a bill. Cashier billing is held back until an authorized server-side stock deduction is built. An Inventory Manager can continue recording supplier bills; the purchase bill screen remains under Purchasing.

## What to check

1. Ensure each dish you want to bill already has a menu item, price, and recipe linked by `dishId`, and that its raw materials have stock. Dishes without a linked recipe cannot be billed. The current review scope supports Dine-in and Takeaway dishes, Cash and manually confirmed UPI, and receipts. Combos and public orders remain hidden.
2. In POS, add a dish, check the displayed tax and total, choose Cash or UPI, and leave **I have received this payment** unchecked if payment is due. Save the bill. Check Order History, the `orders` and `kots` collections, and the stock ledger. The order, kitchen ticket, and deduction commit together.
3. Mark a pending bill paid only after receiving money. Print or reprint the bill. Printing uses the browser print dialog; a physical thermal printer still needs a device-specific check.
4. In Purchasing → Purchase Bills, enter the supplier's actual invoice number and received item quantities. Check that stock increases once. A second bill with the same supplier and invoice number should be rejected. Mark it paid after the supplier payment is sent. This status is a manual record; the app does not transfer money.

The deterministic supplier invoice ID protects invoices newly entered through this branch. Older bills created before this branch have different IDs; check for an existing vendor invoice before entering historical bills. Tax rates come from the restaurant settings document. Receipt formatting and manual UPI confirmation need business review before live customer billing. No payment gateway is connected.

## Checks run on this branch

`npm run lint`, `npm run build`, `npm run test:inventory`, `npm run test:inventory:cloud`, `npm run test:billing:cloud`, and `npm run test:rules`. The Firestore emulator tests include concurrent stock deductions, payment status, duplicate supplier invoice, and permission checks. Local demo UI testing covered creating and paying a POS bill and recording a supplier bill. Browser print dialog and physical printer output have not been verified.
