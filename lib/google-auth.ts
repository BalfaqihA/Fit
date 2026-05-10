import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
} from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useCallback } from 'react';

import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types/community';

WebBrowser.maybeCompleteAuthSession();

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

export function useGoogleSignIn() {
  const [request, , promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
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
