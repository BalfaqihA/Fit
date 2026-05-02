import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { db } from '@/lib/firebase';
import type { MeasurementDoc } from '@/lib/measurements';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function useMeasurements() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [measurements, setMeasurements] = useState<MeasurementDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMeasurements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'measurements'),
      orderBy('recordedAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: MeasurementDoc[] = snap.docs.map((d) => {
          const raw = d.data() as {
            recordedAt?: Timestamp;
            weightKg?: number;
          };
          return {
            id: d.id,
            recordedAt: raw.recordedAt ? raw.recordedAt.toDate() : new Date(),
            weightKg: raw.weightKg ?? 0,
          };
        });
        setMeasurements(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  return useMemo(() => {
    const latest = measurements.length
      ? measurements[measurements.length - 1]
      : null;
    const latestWeight = latest?.weightKg ?? profile.weightKg ?? 0;

    let daysSinceLast: number | null = null;
    if (latest) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last = new Date(latest.recordedAt);
      last.setHours(0, 0, 0, 0);
      daysSinceLast = Math.max(
        0,
        Math.round((today.getTime() - last.getTime()) / MS_PER_DAY)
      );
    }

    return {
      measurements,
      latest,
      latestWeight,
      daysSinceLast,
      loading,
    };
  }, [measurements, profile.weightKg, loading]);
}
