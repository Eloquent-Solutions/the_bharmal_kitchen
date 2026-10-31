# Restaurant isolation — development review

The development phase prepared the customer site at `tbk.eloquentsolutions.in` and its staff portal at `/admin`. The user subsequently authorized production migration and deployment. See [TENANCY_PRODUCTION.md](TENANCY_PRODUCTION.md) for that cutover; the company website on Firebase Hosting and its apex DNS stay unchanged.

## Current implementation

- Opt-in `VITE_MULTI_RESTAURANT=true` resolves one restaurant from the hostname. Unknown, reserved and nested hostnames fail closed; they never default to TBK. The apex domain displays a placeholder in this opt-in build; the existing company site is not deployed from this build.
- Private business records live at `restaurants/{restaurantId}/{collection}/{documentId}`. Legacy `users` become `members/{firebaseUid}` within each restaurant. Firebase Authentication remains shared within the project; roles and status come only from that restaurant's membership.
- Inventory, recipes, supplier bills, POS, takeaway requests, KOT, finance, reports, settings, user access, audit and print queues use immutable scoped database handles. Cached business data includes project, restaurant and user. Physical print-job IDs include the restaurant to prevent deduplication collisions.
- Registry documents contain public identity/status only. Clients cannot provision restaurants, list the registry or grant platform privileges. Suspended restaurants and revoked memberships lose private access. Customer requests remain limited to their own restaurant and user.
- `/` is the public customer entry; `/order` requires customer sign-in. Staff routes are under `/admin`; `/admin` selects an allowed staff home. Previous staff URLs redirect to their canonical admin URL and retain query parameters/hash.
- Branding and safe empty settings derive from the selected restaurant. Bills require configured business details. The existing legacy mode remains available until a separate production migration is reviewed.

## TBK development copy

Development project: `the-bharmal-s-kitchen`. Original top-level documents were preserved. The new copy contains 22 menu items, 5 categories, 55 raw materials, 2 recipes, 52 stock movements, 5 memberships, one existing development test order and its KOT, and the copied settings. Development test records remain in this development-only copy.

Legacy `settings/profile` was also mapped to `settings/restaurant`; the safe customer profile is at `public_settings/restaurant`. There are 150 business documents in the copy, excluding the registry and two private migration records. Source document IDs, references, stock balances, prices and embedded historical timestamps were preserved; membership organization IDs now identify TBK. Firestore create/update metadata reflects the copy time.

The private migration plan is outside Git at `/tmp/tbk-tenancy-20261031/tbk-verified-plan.json` with owner-only file permissions. The original root records remain the recoverable source; the migration never deletes them. Private manifests are under `restaurants/tbk/_migrations`.

The migration tool blocks production, checks collection coverage, reads a consistent snapshot, validates target paths and hashes, and uses create-only preconditions. It verifies every copied record before activation. Retries with the same plan do not overwrite subsequent edits. A guarded compatibility step initializes missing legacy settings only once.

## Review locally

Keep `.env.local` configured for the development Firebase project, then run:

```sh
npm run dev:restaurant
```

This command enables restaurant isolation for this development process only, with local restaurant `tbk`. It does not alter production environment variables. Open the URL printed by Vite, then `/admin` for staff. Existing development sign-ins retain their copied roles. Plain `npm run dev` keeps the existing legacy behavior unless the environment explicitly enables isolation.

The domain resolver also supports `tbk.localhost` in development. Google sign-in on a new host still requires that host to be authorized in the development Firebase Auth console. Emulator previews use disposable test accounts instead of real Google sign-ins.

## Validation

- Full legacy and isolation suite: 74 checks, including cross-tenant read/write/query rejection, differing roles for the same UID, customer enrollment limits, suspension, concurrent same-ID billing, stock/register/print isolation, pickup confirmation, migration retry safety and legacy profile compatibility.
- Lint and production builds for both legacy and opt-in tenancy modes.
- Browser review of customer landing, staff sign-in and `/admin` navigation, TBK inventory, a second restaurant's independent identity/inventory, and canonical route redirects. Mobile viewport emulation was unavailable in this browser session; no responsive styling was changed.
- Development rules were first verified with `--project the-bharmal-s-kitchen`. Production uses the separate guarded runner and explicit project described in TENANCY_PRODUCTION.md.

## Later phases

Super-admin UI, trusted restaurant provisioning and membership management, and subscriptions remain separate work. The TBK production domain and migration use the follow-up cutover in TENANCY_PRODUCTION.md. Client-side role checks cannot authorize platform operations; any future server/Admin SDK endpoints must independently authorize platform administrators and validate restaurant scope.

Before a production tenancy rollout, snapshot production separately, reconcile its real bills and staff memberships, verify the new namespace, configure the app hosting's `tbk` subdomain, and authorize its Firebase Auth hostname. Keep the existing apex Firebase Hosting records intact. Remove legacy root access only after all clients have migrated. Current uploads do not use private Firebase Storage records; add restaurant-specific Storage rules before introducing private file uploads.
