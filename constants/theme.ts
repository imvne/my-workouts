export const colors = {
  background: '#FFFFFF',
  backgroundAlt: '#F7F7F8',
  surface: '#FFFFFF',
  pink: '#EDA3B5',
  pinkDeep: '#D4637F',
  pinkSoft: '#FCEEF2',
  text: '#18181B',
  textMuted: '#71717A',
  textLight: '#A1A1AA',
  border: '#ECECEF',
  borderStrong: '#DCDCE0',
  success: '#7BAE8E',
  white: '#FFFFFF',
  band: {
    bleu: '#5B8DEF',
    vert: '#5BAE7E',
    jaune: '#E8C84A',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const fonts = {
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

export const BAND_KG = {
  bleu: 5,
  vert: 15,
  jaune: 25,
} as const;
