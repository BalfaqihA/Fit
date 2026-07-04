import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { buildUserSearchFields } from '@/lib/users';
import type { GoalKey, UserProfile } from '@/types/community';

const DEFAULT_PROFILE: UserProfile = {
  id: '',
  displayName: '',
  handle: '',
  email: '',
  bio: '',
  goals: [],
  goalsVisible: true,
  weightUnit: 'kg',
  distanceUnit: 'km',
};

type UserProfileContextValue = {
  profile: UserProfile;
  hydrated: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  setGoals: (goals: GoalKey[]) => Promise<void>;
  toggleGoalsVisibility: () => Promise<void>;
};

export const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(DEFAULT_PROFILE);
      setHydrated(false);
      return;
    }

    const ref = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({
            ...DEFAULT_PROFILE,
            ...(snap.data() as UserProfile),
            // Always pin id to the auth uid so community lookups (getUserById)
            // can find the current user regardless of what's stored in Firestore.
            id: user.uid,
          });
        } else {
          // Document doesn't exist yet (rare race after signup); fall back to auth basics
          setProfile({
            ...DEFAULT_PROFILE,
            id: user.uid,
            displayName: user.displayName ?? '',
            email: user.email ?? '',
            handle: (user.email ?? '').split('@')[0].toLowerCase(),
          });
        }
        setHydrated(true);
      },
      (err) => {
        // `permission-denied` is expected during signOut while the listener
        // is being torn down; treat it as benign and silently reset.
        if ((err as { code?: string }).code === 'permission-denied') {
          setProfile(DEFAULT_PROFILE);
          setHydrated(false);
          return;
        }
        setHydrated(true);
      }
    );

    return unsubscribe;
  }, [user]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) {
        throw new Error('You must be signed in to update your profile.');
      }
      const ref = doc(db, 'users', user.uid);
      // Mirror displayName/handle to the lowercase + token fields so smart
      // search in lib/users.ts can find this user (prefix AND any-word-prefix).
      let mirror: Record<string, unknown> = {};
      if (
        typeof patch.displayName === 'string' ||
        typeof patch.handle === 'string'
      ) {
        const nextName =
          typeof patch.displayName === 'string'
            ? patch.displayName
            : profile.displayName;
        const nextHandle =
          typeof patch.handle === 'string' ? patch.handle : profile.handle;
        mirror = buildUserSearchFields(nextName, nextHandle);
      }
      await setDoc(
        ref,
        { ...patch, ...mirror, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
    [user, profile.displayName, profile.handle]
  );

  const setGoals = useCallback(
    (goals: GoalKey[]) => updateProfile({ goals }),
    [updateProfile]
  );

  const toggleGoalsVisibility = useCallback(
    () => updateProfile({ goalsVisible: !profile.goalsVisible }),
    [updateProfile, profile.goalsVisible]
  );

  const value = useMemo<UserProfileContextValue>(
    () => ({ profile, hydrated, updateProfile, setGoals, toggleGoalsVisibility }),
    [profile, hydrated, updateProfile, setGoals, toggleGoalsVisibility]
  );

  return (
    <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
  );
}
