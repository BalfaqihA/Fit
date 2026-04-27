export const lightPalette = {
  primary: '#6C56D9',
  primarySoft: 'rgba(108, 86, 217, 0.08)',
  primaryShadow: 'rgba(108, 86, 217, 0.25)',
  accent: '#FF6B7A',
  text: '#231F20',
  muted: '#8C868A',
  bg: '#F5F5F7',
  card: '#FFFFFF',
  inputBg: '#FAFAFC',
  border: '#E9E7EC',
  divider: '#E9E7EC',
  success: '#2EC07E',
} as const;

export const darkPalette = {
  primary: '#8E78F0',
  primarySoft: 'rgba(142, 120, 240, 0.18)',
  primaryShadow: 'rgba(142, 120, 240, 0.35)',
  accent: '#FF8A93',
  text: '#F4F3F7',
  muted: '#9A93A0',
  bg: '#0F0E13',
  card: '#1B1A22',
  inputBg: '#242230',
  border: '#2D2B38',
  divider: '#2A2832',
  success: '#3DD696',
} as const;

export type Palette = { readonly [K in keyof typeof lightPalette]: string };

export const COLORS: Palette = lightPalette;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  button: {
    shadowColor: lightPalette.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const TYPO = {
  title: { fontSize: 28, fontWeight: '800' as const, color: lightPalette.text },
  subtitle: { fontSize: 15, fontWeight: '500' as const, color: lightPalette.muted },
  label: { fontSize: 13, fontWeight: '600' as const, color: lightPalette.text },
};
