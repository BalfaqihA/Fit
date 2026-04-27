import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types/plan';

type PlanContextValue = {
  plan: Plan | null;
  loading: boolean;
  history: Plan[];
  loadHistory: () => Promise<void>;
};

export const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const planId = profile.currentPlanId;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Plan[]>([]);

  useEffect(() => {
    if (!user || !planId) {
      setPlan(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, 'users', user.uid, 'plans', planId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setPlan({ id: snap.id, ...(snap.data() as Omit<Plan, 'id'>) });
        } else {
          setPlan(null);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, [user, planId]);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }
    const q = query(
      collection(db, 'users', user.uid, 'plans'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    setHistory(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, 'id'>) }))
    );
  }, [user]);

  const value = useMemo<PlanContextValue>(
    () => ({ plan, loading, history, loadHistory }),
    [plan, loading, history, loadHistory]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
