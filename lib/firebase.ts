import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
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
// `.env.development` / `.env.production` automatically based on build profile.
// Missing values fail loudly here so a missing/typo'd `.env` cannot silently
// boot the app against the wrong project.
function requireEnv(key: string): string {
  const v = process.env[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(
      `Missing ${key}. Copy .env.example to .env.development and fill in values from Firebase Console.`,
    );
  }
  return v;
}

const firebaseConfig = {
  apiKey: requireEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requireEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _auth: Auth;
if (Platform.OS === 'web') {
  _auth = getAuth(app);
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
