import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useCallback } from 'react';

import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types/community';

// `expo-auth-session/providers/google` pulls in `expo-crypto`, which resolves
// a native module at module load. If the dev client binary doesn't include
// that native module (e.g. packages added after the last prebuild), the
// `require` throws and any file that imports this module — login, signup —
// fails to load. We swallow that failure so the rest of the app still boots
// and Google sign-in degrades to a clear error instead of a route crash.
type GoogleProvider = typeof import('expo-auth-session/providers/google');
type WebBrowserModule = typeof import('expo-web-browser');

let nativeAvailable = false;
let Google: GoogleProvider | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Google = require('expo-auth-session/providers/google') as GoogleProvider;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WebBrowser = require('expo-web-browser') as WebBrowserModule;
  WebBrowser.maybeCompleteAuthSession();
  nativeAvailable = true;
} catch (err) {
  console.warn(
    '[google-auth] Native modules unavailable — Google sign-in disabled. Rebuild the dev client to enable it.',
    err,
  );
}

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export type GoogleSignInResult =
  | { status: 'signed-in'; user: User; isNewUser: boolean }
  | { status: 'cancelled' };

async function ensureProfile(user: User): Promise<boolean> {
  const profileRef = doc(db, 'users', user.uid);
  const fallbackName =
    user.displayName?.trim() || user.email?.split('@')[0] || 'New User';
  const handle = (user.email?.split('@')[0] ?? user.uid).toLowerCase();

  const seed: UserProfile = {
    id: user.uid,
    displayName: fallbackName,
    handle,
    email: (user.email ?? '').toLowerCase(),
    bio: '',
    goals: [],
    goalsVisible: true,
    weightUnit: 'kg',
    distanceUnit: 'km',
    avatarUri: user.photoURL ?? undefined,
  };

  // Read + create inside a single transaction to close the check-then-write
  // race that allowed two concurrent sign-ins to seed the profile twice.
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(profileRef);
    if (snap.exists()) return false;
    tx.set(profileRef, {
      ...seed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

type GoogleSignInHook = {
  signIn: () => Promise<GoogleSignInResult>;
  ready: boolean;
  isConfigured: boolean;
};

function useGoogleSignInReal(): GoogleSignInHook {
  // Non-null asserted: this implementation is only selected at module load
  // when `Google` resolved successfully.
  const [request, , promptAsync] = Google!.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const isConfigured = !!(IOS_CLIENT_ID || ANDROID_CLIENT_ID || WEB_CLIENT_ID);

  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    if (!isConfigured) {
      throw new Error(
        'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in your env.'
      );
    }
    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { status: 'cancelled' };
    }
    if (result.type !== 'success') {
      throw new Error('Google sign-in did not complete.');
    }
    const idToken = result.params.id_token;
    if (!idToken) {
      throw new Error('Google sign-in did not return an ID token.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const isNewUser = await ensureProfile(cred.user);
    return { status: 'signed-in', user: cred.user, isNewUser };
  }, [isConfigured, promptAsync]);

  return {
    signIn,
    ready: !!request,
    isConfigured,
  };
}

function useGoogleSignInStub(): GoogleSignInHook {
  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    throw new Error(
      'Google sign-in is unavailable in this build. Rebuild the dev client (`npx expo prebuild --clean && npx expo run:android`) to enable it.',
    );
  }, []);
  return { signIn, ready: false, isConfigured: false };
}

// Selected once at module load. `nativeAvailable` cannot change between
// renders, so the hook identity is stable for the lifetime of the app —
// keeping React's rules-of-hooks intact.
export const useGoogleSignIn: () => GoogleSignInHook = nativeAvailable
  ? useGoogleSignInReal
  : useGoogleSignInStub;
