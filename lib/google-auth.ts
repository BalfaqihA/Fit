import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useCallback } from 'react';

import { auth, db } from '@/lib/firebase';
import { buildUserSearchFields } from '@/lib/users';
import type { UserProfile } from '@/types/community';

// `@react-native-google-signin/google-signin` resolves a native module. In
// environments where that module isn't present (Expo Go, web, or a dev client
// built before this package was added), requiring/configuring it can throw.
// We swallow that failure so the rest of the app — login, signup — still boots
// and Google sign-in degrades to a clear error instead of a route crash.
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let nativeAvailable = false;
let GoogleSignin: GoogleSignInModule['GoogleSignin'] | null = null;
let statusCodes: GoogleSignInModule['statusCodes'] | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  // `webClientId` is the Firebase "Web" OAuth client. It sets the audience of
  // the returned ID token so Firebase accepts the credential. The matching
  // Android OAuth client is resolved natively from google-services.json plus
  // the signing-key SHA-1 registered in Firebase Console — no client ID needed
  // here for Android.
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  nativeAvailable = true;
} catch (err) {
  console.warn(
    '[google-auth] Native Google Sign-In module unavailable — Google sign-in disabled. Rebuild the dev client to enable it.',
    err,
  );
}

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
      ...buildUserSearchFields(seed.displayName, seed.handle),
      followerCount: 0,
      followingCount: 0,
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

const isConfigured = !!WEB_CLIENT_ID;

// Turn native Google Sign-In failures into clear, user-facing messages. The
// raw native errors carry a `code` (a `statusCodes` value) but a cryptic
// `message`; the login/signup screens surface `err.message` via `mapAuthError`.
function translateGoogleError(err: unknown): Error {
  const code = (err as { code?: string })?.code;
  if (statusCodes) {
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Google Play Services is unavailable or needs updating.');
    }
    if (code === statusCodes.IN_PROGRESS) {
      return new Error('A Google sign-in is already in progress.');
    }
  }
  // `DEVELOPER_ERROR` (Android status code 10) means the signing-key SHA-1 or
  // OAuth client config doesn't match what's registered in Firebase.
  if (code === 'DEVELOPER_ERROR' || code === '10') {
    return new Error(
      "Google sign-in is misconfigured: the app's signing-key SHA-1 must be added to the Android app in Firebase Console.",
    );
  }
  // Preserve the original error (and its `code`, e.g. Firebase `auth/...`) so
  // `mapAuthError` can map it.
  return err instanceof Error ? err : new Error('Google sign-in failed.');
}

function useGoogleSignInReal(): GoogleSignInHook {
  const signIn = useCallback(async (): Promise<GoogleSignInResult> => {
    if (!isConfigured) {
      throw new Error(
        'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your env.',
      );
    }
    try {
      await GoogleSignin!.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin!.signIn();
      if (response.type === 'cancelled') {
        return { status: 'cancelled' };
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('Google sign-in did not return an ID token.');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(auth, credential);
      const isNewUser = await ensureProfile(cred.user);
      return { status: 'signed-in', user: cred.user, isNewUser };
    } catch (err) {
      throw translateGoogleError(err);
    }
  }, []);

  return { signIn, ready: isConfigured, isConfigured };
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
