import { readFileSync } from 'node:fs';

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const problems = [];

if (process.env.VITE_DATA_MODE !== 'firebase') {
  problems.push('Set VITE_DATA_MODE=firebase.');
}

if (process.env.VITE_STAFF_ONLY !== 'true') {
  problems.push('Set VITE_STAFF_ONLY=true for the first staff-only release.');
}

for (const name of required) {
  if (!process.env[name]?.trim()) problems.push(`Set ${name}.`);
}

if (process.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  problems.push('Remove VITE_USE_FIREBASE_EMULATORS from hosted deployments.');
}

const appId = process.env.VITE_FIREBASE_APP_ID || '';
const senderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
if (appId && senderId && !appId.startsWith(`1:${senderId}:web:`)) {
  problems.push('VITE_FIREBASE_APP_ID must be the Web app ID for the same Firebase project and sender ID.');
}

if (process.env.VERCEL_ENV === 'production') {
  const developmentProjectId = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects?.default;
  if (process.env.VITE_FIREBASE_PROJECT_ID === developmentProjectId) {
    problems.push('Production must use a Firebase project ID different from the .firebaserc development default.');
  }
}

if (problems.length) {
  console.error('Vercel Firebase configuration is incomplete:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log('Vercel Firebase configuration is present.');
}
