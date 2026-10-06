# Security status

The local demo is intended for evaluation. Its roles and data live in browser storage and do not provide server-side access control. Do not use it with real customer or business data.

Firebase mode uses Firebase Authentication and the repository's `firestore.rules`. The rules and application data model have not been verified together for production deployment. Before using a live project, review Firestore access for each collection and role, account provisioning, public customer ordering, and any payment or printing integration.

The installed Firebase 11 dependency currently has four high-severity npm audit findings through Firestore and its transitive packages. npm's suggested automatic fix is a major downgrade, so it was not applied without testing Firebase mode.

Firebase web app config values are public client identifiers. Put your own project's config in an ignored `.env.local` file; never put server-side credentials in `VITE_` variables.
