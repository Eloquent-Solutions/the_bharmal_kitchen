import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Local demo is the default. A live Firebase project is used only by explicit opt-in.
const dataMode = import.meta.env.VITE_DATA_MODE || 'demo';
if (!['demo', 'firebase'].includes(dataMode)) {
  throw new Error('VITE_DATA_MODE must be "demo" or "firebase".');
}
export const isDemoMode = dataMode === 'demo';
export const isStaffOnly = import.meta.env.VITE_STAFF_ONLY === 'true';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!isDemoMode) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Firebase mode requires: ${missing.join(', ')}. Set them in .env.local or use VITE_DATA_MODE=demo.`);
  }
}

const app = isDemoMode ? null : (getApps().length ? getApp() : initializeApp(firebaseConfig));
const auth = app ? getAuth(app) : null;
const googleProvider = app ? new GoogleAuthProvider() : null;
googleProvider?.setCustomParameters({ prompt: 'select_account' });

let db = null;
if (app) {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app);
  }
}

const storage = app ? getStorage(app) : null;

if (app && import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export { app, auth, db, storage, googleProvider };
export default app;
