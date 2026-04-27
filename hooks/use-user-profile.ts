import { useContext } from 'react';

import { UserProfileContext } from '@/contexts/user-profile';

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used inside <UserProfileProvider>');
  }
  return ctx;
}
