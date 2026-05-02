import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { todayIso } from '@/lib/plan-day';

export type MeasurementDoc = {
  id: string;
  recordedAt: Date;
  weightKg: number;
};

export async function recordWeight(uid: string, weightKg: number) {
  const userRef = doc(db, 'users', uid);
  const measurementRef = doc(collection(db, 'users', uid, 'measurements'));
  const batch = writeBatch(db);
  batch.set(measurementRef, {
    weightKg,
    recordedAt: serverTimestamp(),
  });
  batch.set(
    userRef,
    {
      weightKg,
      weightLastUpdatedAt: todayIso(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
  return measurementRef.id;
}

export function bmiFromKg(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}
