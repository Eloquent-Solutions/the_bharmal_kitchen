# The Bharmals Kitchen

Restaurant management app built with React, Vite, and Firebase. The previous developer added pages for POS, kitchen orders, tables, menu, inventory, purchasing, customers, staff, finance, reports, printing, and settings. Most screens use `src/services/dataService.js`, which stores demo data in browser local storage and can sync with Firestore when Firebase mode is configured.

## Run locally

Use Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite (normally [http://localhost:5173](http://localhost:5173)). The app defaults to **local demo mode** with no `.env` file or Firebase account. Go to `/login` and choose Owner, Cashier, Chef, or Customer. Owner gives access to the full management interface. The `/order` page is also public.

Demo changes persist in this browser's local storage. They are not shared with other devices. To reset demo data, clear this site's browser storage. Remote images and Google Fonts may require internet access.

```bash
npm run build
npm run lint
npm run preview
```

## Optional Firebase mode

Copy `.env.example` to `.env.local`, set `VITE_DATA_MODE=firebase`, and supply the Firebase web app config. In this mode, sign-in uses Firebase Authentication and Firestore operations use the configured project. Google sign-in and account creation require the corresponding Firebase providers and Firestore rules. Set `VITE_USE_FIREBASE_EMULATORS=true` only when the Auth, Firestore, and Storage emulators are running on ports 9099, 8080, and 9199.

Firebase mode is separate from the local demo. It does not silently sign users into a demo account after an authentication error. Existing Firestore data is read after sign-in; demo records are not automatically uploaded to an empty cloud project. Cloud behavior and production readiness still need end-to-end verification before real restaurant use.

For a separate production Firebase project and a staff-only Vercel rollout, follow [DEPLOYMENT.md](DEPLOYMENT.md). This repository is prepared for that workflow; it has not been deployed or verified with production data.

## Project map

- `src/app/router.jsx`: routes and page loading.
- `src/hooks/useAuth.jsx`: local demo and Firebase authentication.
- `src/services/dataService.js`: local data, defaults, and optional Firestore sync.
- `src/services/realtimeOrderService.js`: Firestore order listener in Firebase mode.
- `src/pages/`: feature screens.
- `src/styles/index.css`: shared styling.

The other Markdown files are planning and design notes from the previous developer. Their feature-completion and security claims have not been independently verified; see `PROGRESS.md` and `TESTING.md` for the current check status.
