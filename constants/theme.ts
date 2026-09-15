export const colors = {
  background: '#F6EBDE',
  backgroundAlt: '#EEDFCC',
  surface: '#FDF6EC',
  pink: '#E8A0B0',
  pinkDeep: '#D4788C',
  pinkSoft: '#F5D0D8',
  text: '#4A3B36',
  textMuted: '#8A746C',
  textLight: '#B5A099',
  border: '#E6D4BF',
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
  sm: 8,
  md: 14,
  lg: 22,
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
