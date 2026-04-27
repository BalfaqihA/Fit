import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types/community';

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

function buildSeedProfile(uid: string, fullName: string, email: string): UserProfile {
  return {
    id: uid,
    displayName: fullName.trim(),
    handle: email.split('@')[0].toLowerCase(),
    email: email.trim().toLowerCase(),
    bio: '',
    goals: [],
    goalsVisible: true,
    weightUnit: 'kg',
    distanceUnit: 'km',
  };
}

export async function signUpWithEmail({ fullName, email, password }: SignUpInput) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = cred.user;

  await updateProfile(user, { displayName: fullName.trim() });

  const seed = buildSeedProfile(user.uid, fullName, email);
  await setDoc(doc(db, 'users', user.uid), {
    ...seed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signInWithEmail({ email, password }: SignInInput) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordInput) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No user is currently signed in.');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export function subscribeToAuthState(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again in a moment.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to perform this action.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    default:
      if (err instanceof Error && err.message) return err.message;
      return 'Something went wrong. Please try again.';
  }
}
