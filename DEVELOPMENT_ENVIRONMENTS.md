# TBK deployment environments

| App | Branch / environment | Firebase project | Business records |
| --- | --- | --- | --- |
| `tbk.eloquentsolutions.in` | `main` / Vercel Production | `the-bharmal-kitchen` | `restaurants/tbk` |
| `the-bharmal-kitchen.vercel.app` | `develop` / Vercel Preview | `the-bharmal-s-kitchen` | `restaurants/tbk` |
| `localhost` / `127.0.0.1` | Local checkout | `the-bharmal-s-kitchen` | `restaurants/tbk` |

Local and hosted development share their existing development dataset, including test records. They do not copy or synchronize production writes. Google accounts, staff memberships and stock balances are separate between Firebase projects.

## Configuration

Keep the complete development Firebase web config in ignored `.env.local`. Run `npm run dev`; Firebase mode with the development project selects TBK isolation automatically. The tab title includes “Development”. Local demo and explicitly configured local emulators remain available.

In Vercel, scope **all six** `VITE_FIREBASE_*` web config variables to **Preview → develop**, using the development project's matching API key, auth domain, project ID, storage bucket, sender ID and app ID. Set `VITE_DATA_MODE=firebase`, `VITE_MULTI_RESTAURANT=true`, `VITE_PLATFORM_DOMAIN=eloquentsolutions.in` and the desired release flags in that same scope. Keep Production's complete web config pointing at the production project. Firebase web config belongs in Config values; never put Admin SDK credentials in `VITE_*` variables.

The Vercel domain assignment must connect `the-bharmal-kitchen.vercel.app` to **Preview → develop** and the custom TBK domain to **Production**. The repository has no redirect from the development hostname to production. Authorize the exact development hostname in the development Firebase Authentication project's domains. Add only verified project Preview hostnames when Google sign-in is needed there.

Push development work to `develop` to update the testing site. Merge reviewed changes into `main` to release production. Changing environment variables requires a new deployment; an existing bundle keeps the values with which it was built.

## Isolation checks

Vite embeds Vercel's actual `VERCEL_ENV`, `VERCEL_URL` and `VERCEL_BRANCH_URL` at build time. It does not trust an editable public variable to choose the target. The preflight and runtime both reject production Firebase in local/Preview builds, development Firebase in Production, mixed Auth domains, and hosted emulator/demo mode. Hosted builds require restaurant isolation.

Only the named development hostname and the current Preview deployment/branch hostnames resolve to TBK in a Preview build using development Firebase. Unknown hostnames fail closed. Production resolves restaurants from the platform domain as before. Cache keys include the Firebase project, restaurant and user; browser authentication is isolated by origin and project.

`tests/deployment-environments.test.mjs` covers project/Auth mismatches, the build preflight and Preview hostname boundaries. The full emulator suite also verifies database tenant isolation.
