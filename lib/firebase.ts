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
import { Platform } from 'react-native';

// Firebase config is sourced from `process.env.EXPO_PUBLIC_FIREBASE_*` so dev
// and prod can point at different Firebase projects. Expo loads
// `.env.development` / `.env.production` automatically. The fallbacks below
// keep the current dev project working until a `.env` file is provided —
// remove them once you have separate dev/prod projects wired up.
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    'AIzaSyADGRqqeOzUDcq8HJpi8fy_U8ycYV_dpB8',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    'fitness-874c3.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'fitness-874c3',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    'fitness-874c3.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1023687451349',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    '1:1023687451349:web:16fa40799cf93750e2385c',
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-9Q710QQVMH',
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
export { app };
