# Inventory-only staff rollout on Vercel and Firebase

The first client release is **staff-only and inventory-only**. Vercel serves the Vite site; Firebase provides Authentication and Firestore. The production Firebase project must be separate from the project used in `.env.local`. The site has not been deployed or accepted for real restaurant operations yet.

The client view contains raw materials, stock ledger, wastage, stock count, utensils, suppliers, purchase bills, inventory valuation, and owner user management. Recipes need menu setup and are held for a later branch. Purchase orders, POS, customer ordering, finance, and other modules are hidden and direct routes redirect to inventory. This switch is a user-interface scope; Firestore rules enforce data access.

## 1. Create the production Firebase project

1. In Firebase Console, create a new project for production and register a **Web app** in it.
2. Copy that Web app's six config values: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. The `appId` begins with `1:`; a value beginning with `G-` is an Analytics measurement ID.
3. Enable Firebase Authentication and the Google provider. Enable Email/Password as well if staff will use passwords.
4. Create a Cloud Firestore database. Do not copy test-mode or public-write rules into production.
5. After Vercel gives the site a hostname, add that hostname under **Authentication → Settings → Authorized domains**. Enter only the hostname, without `https://` or a path. Add each custom or preview hostname used for sign-in.

New Google users receive a `Customer` profile. For the first owner, sign in once, find the account UID under **Authentication → Users**, then edit `users/{uid}` in **Firestore Database → Data**: set `role` to the string `Owner` and `status` to `active`. Sign out and back in. The owner can assign roles and tabs to subsequent staff in **Settings → Users & Roles** after those staff members sign in. Invite and manual Add User actions are hidden in Firebase mode because they do not create Authentication accounts or send email.

## 2. Configure Vercel

Import this Git repository as a Vercel project. The root is the repository root. Vercel should detect Vite; `vercel.json` sets the build command, `dist` output, and SPA rewrite for direct links such as `/dashboard`.

In **Project Settings → Environment Variables**, set these for **Production** using values from the new production Firebase Web app:

| Variable | Value |
| --- | --- |
| `VITE_DATA_MODE` | `firebase` |
| `VITE_STAFF_ONLY` | `true` |
| `VITE_INVENTORY_ONLY` | `true` |
| `VITE_FIREBASE_API_KEY` | Production Web app `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Production Web app `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | Production Web app `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Production Web app `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Production Web app `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | Production Web app `appId` |

Do not set `VITE_USE_FIREBASE_EMULATORS` on Vercel. For **Preview** deployments, use the development Firebase project's Web app values and the same `VITE_DATA_MODE=firebase`, `VITE_STAFF_ONLY=true`, and `VITE_INVENTORY_ONLY=true` flags. Deploy the same restrictive Firestore rules to the development project before sharing preview links. This keeps preview traffic out of the production database. A `VITE_` value is embedded in the browser bundle; never put service-account JSON or private keys in these variables. Changing Vercel variables requires a new deployment.

The Vercel build fails if required Firebase values or either release flag is absent. A Production build also rejects the development project ID in `.firebaserc`. This prevents common configuration mistakes, but it does not fully verify the Firebase project or secure its data.

## 3. Secure and verify Firestore

`firestore.rules` now contains role-based rules for the staff-only release. The `.firebaserc` default still names the development project, so always specify the production project ID when deploying rules:

```bash
firebase login
firebase deploy --only firestore:rules --project YOUR_PRODUCTION_PROJECT_ID
```

With the Firebase CLI installed, run `npm run test:rules` and `npm run test:inventory:cloud` locally before deploying. The emulator tests check access rules, concurrent stock changes, wastage/count validation, bill inwarding once, and owner role assignment. Compare the rules currently shown in Firebase Console with this file; editing this file does **not** update deployed rules.

The app's route guard is only a user-interface control. Firestore rules are the actual data access boundary. The staff-only build disables public signup, ordering, and order tracking routes. It does not implement a public ordering or payment system.

## 4. Acceptance checks before going live

- Build, lint, and inventory flow tests pass: `npm run build`, `npm run lint`, and `npm run test:inventory`.
- Owner sign-in reaches `/inventory/materials`; inventory and purchasing screens load from the production project. Direct visits to `/dashboard`, `/pos`, and `/orders` redirect to inventory.
- A staff member receives only the expected role and tabs. A customer or unsigned visitor cannot reach staff pages or read Firestore data.
- The production project starts without bundled sample orders, customers, stock, or staff records.
- Inventory changes remain correct across two browsers after refresh. Check stock counts, purchase bills, and wastage with disposable test records, including simultaneous adjustments from two staff sessions.
- A stock save shows success only after the Firestore transaction commits. Sync failures block the inventory view. Verify the stock and ledger documents in Firebase Console after the smoke test.

The released stock actions use Firestore transactions and live listeners. Firestore rules still permit authorized staff to write the collections directly, so a modified client or an older build can bypass the app's stock-ledger workflow. For tamper-resistant accounting, move these mutations behind server-side functions and narrow the rules. Do not treat browser-only records or an unverified production project as accepted live inventory data.

## Branches while the client enters inventory

Merge the reviewed inventory release branch into `main` only after the production smoke test passes. Keep `main` as the stable client version. Start each other module from `main` on its own branch (for example `codex/recipes-menu`, `codex/orders-pos`, or `codex/finance`); use Vercel Preview and the development Firebase project for those branches. Merge each module after its workflow and permissions are checked. Keep `VITE_INVENTORY_ONLY=true` in Production until the client approves exposing another module.

Do not accept real customer orders or payments through this release. The customer payment confirmation is only a client-side simulation, and the public ordering workflow needs separate server-side payment verification, order validation, and security review.
