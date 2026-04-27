import { useContext } from 'react';

import { CommunityContext } from '@/contexts/community';

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunity must be used inside <CommunityProvider>');
  }
  return ctx;
}
