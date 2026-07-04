import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  // @ts-expect-error getReactNativePersistence is exported at runtime by firebase/auth in v10+
  getReactNativePersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase config is sourced from `process.env.EXPO_PUBLIC_FIREBASE_*` so dev
// and prod can point at different Firebase projects. Expo loads
// `.env.development` / `.env.production` automatically based on build profile;
// EAS build profiles inject these via the `env` block in `eas.json`.
//
// CRITICAL: each var MUST be referenced as a *static* `process.env.EXPO_PUBLIC_X`
// member expression. Expo inlines these at build time by literal text
// replacement — a dynamic `process.env[key]` lookup is NOT inlined and resolves
// to `undefined` in a release build, which previously threw here at startup and
// crashed the app on launch (worked in dev only because Metro serves env vars
// live). Do not refactor these back into a loop/helper that takes the key as a
// variable.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

// Fail loudly if a required value is missing (e.g. a typo'd `.env` or a build
// profile missing the `env` block) so we never silently boot against a broken
// config. Iterating `firebaseConfig` (not `process.env`) is safe — the values
// above are already inlined literals by this point.
const REQUIRED_KEYS: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];
for (const key of REQUIRED_KEYS) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Missing Firebase config "${key}". Copy .env.example to .env.development ` +
        `(and set the EAS build profile env in eas.json) with values from the ` +
        `Firebase Console.`,
    );
  }
}
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _auth: Auth;
if (Platform.OS === 'web') {
  try {
    // Pin browser persistence explicitly. Otherwise on the Metro dev server the
    // default-resolution chain occasionally lands on inMemoryPersistence, which
    // makes onAuthStateChanged fire `null` right after signIn — leaving the user
    // stuck on the login screen with no error.
    _auth = initializeAuth(app, { persistence: browserLocalPersistence });
  } catch {
    _auth = getAuth(app);
  }
} else {
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called twice during fast refresh; fall back to getAuth
    _auth = getAuth(app);
  }
}

export const auth = _auth;
export const db = getFirestore(app);
export const functions: Functions = getFunctions(app, 'us-central1');
export const storage: FirebaseStorage = getStorage(app);
export { app };
