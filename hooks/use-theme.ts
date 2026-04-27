import { useContext } from 'react';

import { ThemeContext } from '@/contexts/theme';

export type { ThemeMode, ColorScheme } from '@/contexts/theme';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
