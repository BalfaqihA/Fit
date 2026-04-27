import { useContext } from 'react';

import { PlanContext } from '@/contexts/plan';

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('usePlan must be used inside <PlanProvider>');
  }
  return ctx;
}
