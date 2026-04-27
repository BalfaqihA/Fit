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
import { Platform } from 'react-native';

// 🔧 Replace these placeholders with the values from Firebase Console
//    (Project settings → Your apps → Web app → SDK setup and configuration).
const firebaseConfig = {
  apiKey: "AIzaSyADGRqqeOzUDcq8HJpi8fy_U8ycYV_dpB8",
  authDomain: "fitness-874c3.firebaseapp.com",
  projectId: "fitness-874c3",
  storageBucket: "fitness-874c3.firebasestorage.app",
  messagingSenderId: "1023687451349",
  appId: "1:1023687451349:web:16fa40799cf93750e2385c",
  measurementId: "G-9Q710QQVMH"
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
export { app };
