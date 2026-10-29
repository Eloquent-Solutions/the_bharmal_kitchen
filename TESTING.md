# Verification

## Automated checks

Run:

```bash
npm ci
npm run lint
npm run build
```

The build confirms that Vite can compile the app. Lint checks syntax, common JavaScript errors, and React hook rules. These checks do not prove that every workflow or Firebase deployment works.

## Manual local smoke test

1. Run `npm run dev` and open the printed local URL.
2. Visit `/login` and choose **Owner** in local demo mode.
3. Open Dashboard, POS, Menu, Orders, Kitchen, Inventory, and Settings from the sidebar.
4. Add or edit a demo record, refresh the page, and confirm it remains in this browser.
5. Sign out and use the **Customer** demo button; check `/order`.
6. If Firebase mode is used, test sign-in, Firestore permissions, and order sync separately against the intended project or emulators.

The previous checklist marking all features as tested was not backed by a test suite in this repository.

In October 2026, the local demo was smoke tested in a browser: owner and customer sign-in worked, dashboard/POS/menu pages rendered, a category survived reload, and map links resolved. The temporary test category was deleted afterward.
## Finance and reports

Run `npm run test:finance` for business dates, saved-tax reporting, cost completeness, cash reconciliation, and safe CSV output. Run `npm run test:finance:cloud` for register concurrency, idempotent payments and expenses, supplier cash payments, late pickup collections, day closure, and finance permissions in a local Firestore emulator.

The finance flow also changes billing and supplier payments, so run the billing, inventory, and rules emulator suites before release. Browser review uses a disposable Auth/Firestore emulator project and covers opening a shift, paid takeaway billing, expenses, cash transfers, physical counting, saved day close, report figures, CSV downloads, and a narrow mobile viewport.
