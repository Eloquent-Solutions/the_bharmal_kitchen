# Dashboard, printing, settings, and recipe review

Reviewed implementation for the finance, dashboard, printing, settings, and recipe-draft release. The verification below used disposable local data; the production rollout is documented in DEPLOYMENT.md.

## Dashboard

Available to financial roles when billing + finance flags are enabled. Uses the same business-date, saved-tax, payment-ledger, and frozen-ingredient-cost calculations as the finance reports. Shows billed revenue, receipts collected by payment date, unpaid bills, signed profit/loss estimates, active orders, expenses, and expected current drawer cash. Missing historical cost/tax records withhold profit rather than inventing a margin. Inventory purchases are not deducted twice.

## Settings

Owner/Admin edits are awaited and recorded in append-only audit entries. Screen-specific patches merge transactionally, so a tax change does not revert a concurrent address change. Existing bills retain their saved business identity and calculation.

- Restaurant: public name, pickup/receipt address, phone, Maps link, pickup availability; private receipt email, GSTIN, FSSAI. `public_settings/restaurant` exposes only the public subset. Saving pickup availability blocks/unblocks **new customer requests**, including direct client writes through Firestore rules. Existing accepted orders can still be processed.
- POS: default cash/UPI selection, required customer phone (validated again in the bill transaction), automatic receipt and KOT queue creation. A table number remains mandatory for dine-in.
- Tax: CGST, SGST, service charge, rounding used in real checkout and saved bill snapshots. No statutory tax rates are prescribed by this change.
- Notifications: incoming orders/requests, ready status changes, browser alerts, low stock notifications while a staff browser is open. Browser permission is per device. No email, WhatsApp, or background push delivery is implied.
- Audit: latest 200 immutable records for the newly connected settings, recipe acceptance, and manual print actions; search and CSV. Legacy inventory logging has real actor IDs. This is an application activity log, not a server-enforced record of every possible direct database edit.
- Branches: contact directory only. There is still one shared stock pool and cash register. No branch accounting, branch-specific order routing, or separate inventory is claimed.

## Printing

See `print-bridge/README.md`. Owner/Admin configure printers, routes, and receipt layout. Managers can pair a print station and process/reprint queue entries. Browser receipt/KOT printing remains available; network delivery can be requested in Order History and KOT logs. Receipt design controls real output and previews without the old editor's sample tax IDs, UPI accounts, or sample bill numbers. Required items/taxes/totals are always rendered. Images, QR codes, advanced drawer controls, and automatic Windows service installation are deferred.

## Recipes

Recipes page can prepare estimated drafts for unlinked chicken, rice, noodle, and cream dishes using matching inventory and current prices. Existing recipes remain intact. Unknown dishes require manual formulation. Drafts live in `recipe_drafts` and cannot be billed. They show missing stock mappings/prices; ambiguous matches are not guessed. Maida/refined wheat flour and corn flour stay distinct. Oil is an estimated consumption allocation, not fryer fill. Rice/noodles are estimated dry weights.

Staff must review ingredient mappings, stock-unit quantities, yield, and positive prices and accept an explicit estimate acknowledgement before a draft becomes an active stock-deducting recipe. It is labeled `approved-estimate`, not chef-verified. Costs are ingredient estimates, excluding labor, fuel, packaging, and other overhead unless recorded separately. A measured trial batch remains necessary to confirm portion yield and consumption.

## Release and deferred work

New screens are exposed within the inventory/billing release scope. Dashboard additionally requires `VITE_FINANCE_ENABLED=true`. Deploy the matching Firestore rules with any future release. Save Restaurant details once to publish the sanitized profile document. Production activation requires the matching Firestore rules and finance flag described in DEPLOYMENT.md.

Physical printer acceptance is deferred by the user. Table service, floor plan, reservations, waitlist, HR, attendance, leave, payroll, and staff reports remain in the final phase.

## Checks

- `npm run lint`
- `npm run build`
- `npm run test:inventory`
- `npm run test:finance`
- `npm run test:printing` (temporary loopback TCP/HTTP simulator)
- `npm run test:settings:cloud` (disposable Firebase emulator)
- Existing billing, inventory, finance and Firestore-rule emulator suites.

The integration suite covers atomic bill/stock/KOT/queue creation, idempotent retries, missing-route rollback, competing workers, expired leases, immutable queue content and audit entries, private/public settings separation, pickup pause, POS phone enforcement, and recipe approval. The simulator covers actual socket bytes, access controls, job persistence, and preventing fallback/retry after uncertain delivery.

### Verification status in this workspace

Completed on 30 October 2026 using disposable local Auth/Firestore emulators and an actual loopback TCP printer simulator. No development/production business records were changed.

- Lint, production build, and whitespace checks passed. The existing Firebase bundle size warning remains.
- 46 combined cloud/rules/printing checks passed, plus 7 finance and 7 inventory checks: **60 passing automated checks**.
- Browser review verified dashboard figures against test fixtures; POS phone validation; a pending takeaway bill with stock deduction and automatic receipt/KOT jobs; bridge pairing; actual receipt and KOT byte delivery to the simulator; explicit-copy acknowledgement; receipt design save/preview; draft recipe mapping and acceptance; pickup pause persistence; branch contact save; immutable audit display and CSV export.
- Browser review found and fixed a blank iframe preview (replaced by an accessible preview using the shared document model), an incorrect POS tax field display, and mobile dashboard grid overflow. Desktop and 390 px phone layouts were inspected; the mobile modal fits and tables scroll inside their containers.
- Competing print claims are handled without weakening ownership rules: if the losing transaction receives a transition permission rejection, it reads authoritative server state and returns without claiming an already-owned job. Actual permission failures still surface. Expired delivery becomes uncertain, not an automatic reprint.
- Recipe estimates keep separate maize/corn flour and refined wheat flour mappings; black-pepper dish drafts include black pepper. Accepted estimates remain visibly labeled.

Review captures are saved in the Codex visualization workspace as `modules-dashboard-review.png`, `modules-dashboard-mobile-review.png`, and `modules-print-queue-review.png`. Setup instructions remain in `print-bridge/README.md`.

The verification phase performed no production writes or deployment. Physical Windows/printer compatibility and paper-output checks remain deferred; text-only network output currently excludes logos and QR codes.
