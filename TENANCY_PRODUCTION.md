# TBK production restaurant cutover

The user authorized migration of current production records and deployment to `tbk.eloquentsolutions.in`. This release changes URL layout and restaurant data scope. It preserves the currently released feature switches; finance activation and physical printer testing are separate from this cutover.

## Destination and preserved data

- Customer entry: `https://tbk.eloquentsolutions.in/`.
- Owner/staff entry: `https://tbk.eloquentsolutions.in/admin`.
- Firebase production project: `the-bharmal-kitchen`.
- Business data destination: `restaurants/tbk/{collection}/{documentId}`.
- Roles: `restaurants/tbk/members/{existingFirebaseUid}`. Authentication accounts and credentials are not moved or changed. Existing Google and password sign-ins remain in the same Firebase project.
- Legacy production data is preserved, including current stock, all supplier purchase bills, pickup requests and staff roles. Development test data is not imported. The preflight snapshot contained 149 business records: 55 materials, 22 dishes, 5 categories, 2 recipes, 3 supplier bills, 6 user profiles, 1 supplier, 1 pending request, 51 ledger movements and 3 settings documents. The frozen snapshot is authoritative if these counts change before cutover.
- A sanitized public restaurant profile is added if absent. Existing business document IDs and embedded timestamps are retained; Firestore copy metadata changes. Global organization IDs become `tbk` on copied memberships.
- No company Firebase Hosting or apex DNS changes are part of this deployment. No super-admin portal is released.

## Private backup and migration tools

Snapshots, plans, previous rules and Auth domain configuration are in `.local-backups/production-tenancy-20261031/`, excluded from Git and owner-readable only. Authentication credential export is not performed; the existing sign-in accounts are preserved. Never commit these files or print their contents in deployment logs.

`migrate-tbk-development.mjs` continues to block production. `migrate-tbk-production.mjs` is an explicitly scoped runner that can access only the TBK production project. Its helpers accept a single disposable emulator project for tests.

## Ordered cutover

1. Back up current production business records, deployed rules and Auth domain configuration. Record the previous deployment commit `74bb8ddff3294800764f17aabcc27941132ce8d3`.
2. Deploy the tested rules with `firebase deploy --only firestore:rules --project the-bharmal-kitchen`. With no cutover lock, existing clients continue as before.
3. Confirm the new domain's HTTPS and production Vercel assignment. Add the hostname to production Firebase Auth's authorized domains, preserving the existing list.
4. Set Vercel Production `VITE_MULTI_RESTAURANT=true` and `VITE_PLATFORM_DOMAIN=eloquentsolutions.in`. Existing bundles keep running until deployment. Never enable emulator/local restaurant overrides on hosted builds.
5. Run `node scripts/migrate-tbk-production.mjs freeze`. An IAM-only `platform_migrations/tbk` record blocks legacy client reads/writes during the cutover; public contact details remain safe to read. The already-deployed restaurant rules are independent of this legacy lock.
6. Run `plan`, `apply`, then `verify` with the same runner. The private plan is created from the frozen PRODUCTION snapshot, with create-only document writes and hash checks. The new registry stays unavailable until every record is copied and verified. If a privileged source write occurs during this interval, verification rejects activation/release.
7. Commit and push the reviewed changes to `main`. Vercel deploys that commit with its Production environment. Verify the custom-domain customer page, guest `/admin` protection, staff data, redirects, assets and domain authorization.
8. Run `finish --deployment https://THE-VERIFIED-DEPLOYMENT.vercel.app`. This records the deployment and permanently retires legacy client access while retaining original records for recovery. Existing open tabs must reload onto the new app.

Each command writes only summary counts to the terminal. The `plan` step uses exclusive private files and refuses silent replacement. Interrupted copies resume from their exact plan without overwriting changed destination records.

## Rollback boundaries

Before the new copy has changed, `rollback-unfreeze` checks the frozen source and all copied records, then atomically suspends the tenant namespace and reopens legacy access. Version preconditions close the verification/write race. It also supports an inaccessible, incomplete provisioning copy. Revert the Vercel production deployment/settings to the recorded prior version as part of rollback.

Once the new app has accepted updates, the runner refuses to reopen divergent legacy data. Do not remove the lock or overwrite the new namespace. Reconcile those updates under a new maintenance plan first. Completed cutovers cannot be reopened by this runner.

## Validation

The regression suite covers existing billing/inventory/finance/rules/printing behavior and restaurant boundaries. Cutover tests additionally prove that old owners/customers cannot write during the freeze, source drift aborts the copy, staff UIDs and bills survive, replays do not replace changed records, and rollback never leaves two writable namespaces.

Physical Windows Wi-Fi/LAN printer setup and receipt-on-paper testing remain deferred, as previously agreed.
