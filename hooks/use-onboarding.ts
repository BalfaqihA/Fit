import { useContext } from 'react';

import { OnboardingContext } from '@/contexts/onboarding';

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  }
  return ctx;
}
