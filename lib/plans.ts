import { doc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export async function updatePlanDaysPerWeek(
  uid: string,
  planId: string,
  daysPerWeek: number,
) {
  const safe = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  const ref = doc(db, 'users', uid, 'plans', planId);
  await updateDoc(ref, { 'profile.daysPerWeek': safe });
}
