import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import {
  ROLE_PERMISSIONS,
  type AdminClaims,
  type AdminPermission,
  type AdminRole,
} from '@/types/admin';

// Reads the admin custom claim off the Firebase ID token. This only governs
// what the UI shows — every privileged action is independently re-checked
// server-side by `assertAdmin` in the Cloud Functions, so a tampered client
// gains nothing.

type AdminState = {
  loading: boolean;
  isAdmin: boolean;
  role: AdminRole | null;
  claims: AdminClaims | null;
};

const SIGNED_OUT: AdminState = {
  loading: false,
  isAdmin: false,
  role: null,
  claims: null,
};

export function useAdmin() {
  const { user, initializing } = useAuth();
  const [state, setState] = useState<AdminState>({
    loading: true,
    isAdmin: false,
    role: null,
    claims: null,
  });

  const read = useCallback(async (forceRefresh: boolean) => {
    const current = auth.currentUser;
    if (!current) {
      setState(SIGNED_OUT);
      return;
    }
    try {
      const res = await current.getIdTokenResult(forceRefresh);
      const isAdmin = res.claims.admin === true;
      const role = (res.claims.adminRole as AdminRole | undefined) ?? null;
      setState({
        loading: false,
        isAdmin,
        role: isAdmin ? role : null,
        claims: { admin: isAdmin, adminRole: role ?? undefined },
      });
    } catch {
      setState(SIGNED_OUT);
    }
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setState(SIGNED_OUT);
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    void read(false);
  }, [user, initializing, read]);

  const can = useCallback(
    (perm: AdminPermission): boolean => {
      if (!state.isAdmin || !state.role) return false;
      if (state.role === 'owner') return true;
      return ROLE_PERMISSIONS[state.role].includes(perm);
    },
    [state.isAdmin, state.role],
  );

  const refresh = useCallback(async () => {
    await read(true);
  }, [read]);

  return { ...state, can, refresh };
}
