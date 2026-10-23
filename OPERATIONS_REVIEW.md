# Takeaway and kitchen operations

The Vercel production release enables staff operations and Google sign-in pickup requests. Staff must confirm every request before a bill, KOT, or stock deduction is created. Payment is collected at pickup.

## Local switches

Keep the development Firebase Web app values in `.env.local`, then set these flags locally. Production uses its own Firebase project with the same feature flags in Vercel.

```env
VITE_DATA_MODE=firebase
VITE_STAFF_ONLY=true
VITE_INVENTORY_ONLY=true
VITE_BILLING_ENABLED=true
VITE_OPERATIONS_ENABLED=true
VITE_CUSTOMER_TAKEAWAY_ENABLED=true
```

Run `npm run dev`. Both Firebase projects need the updated `firestore.rules` before customer pickup requests can be submitted.

## What to check

1. **Phone order:** Sign in as Owner or Manager, open POS, leave Takeaway selected, enter the caller's name and phone, add a dish with a linked recipe and sufficient stock, and save. Leave “I have received this payment” unchecked for pay at pickup. Confirm the bill, KOT, and stock movement appear once.
2. **Kitchen:** Open Orders → Active and Kitchen → KDS/KOT. Move received to cooking to ready. Reprint a KOT using the browser print dialog. Mark a takeaway collected from Active Orders. Record payment from Orders → History when money is received, then print the receipt if needed.
3. **Customer request:** Open `/order`, sign in with Google as a Customer, select dishes, enter name and phone, and request pickup. Owner or Manager confirms it in Orders → Active. The customer then sees confirmation, kitchen status, and “Pay at pickup.” The request cannot create a bill or charge payment by itself.
4. **Negative cases:** A dish without a recipe, insufficient stock, or a changed price must leave the request pending for staff to resolve or decline. Two staff confirming one request must produce only one bill and one stock deduction.

The receipt and KOT use the browser's print dialog. The printer configuration, routing, and queue screens do not connect to physical thermal printers or provide silent printing; a local print bridge and actual printer hardware are needed for that. Do not use their connection status as proof a physical ticket printed.

The imported menu has 22 available dishes but only two linked recipes. Staff cannot confirm requests for other dishes until recipes are added. Customers are shown that submission is a request and the restaurant will confirm availability and price. Review menu availability before promoting the public link.

## Chicken Chilly recipe

The recipe has 15 ingredients and showed ₹67.49 per portion at the development raw material prices. The added costing assumptions are 10 g Red Chilli Sauce for the audio's “red chilli,” 5 g Salt, and 10 g absorbed Cooking Oil. These assumptions are written in the recipe notes for later chef review. It currently shows zero servings ready because Egg has no stock balance; add a verified egg count before using this dish to test billing.

Emulator checks: `npm run test:rules`, `npm run test:billing:cloud`, `npm run test:inventory`, `npm run lint`, and `npm run build`.
