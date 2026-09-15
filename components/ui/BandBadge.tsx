import { StyleSheet, Text, View } from 'react-native';

import { BAND_KG, colors, fonts, radii, spacing } from '@/constants/theme';
import type { BandColor } from '@/types/workout';

type Props = {
  color: BandColor;
};

export function BandBadge({ color }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.band[color] + '33' }]}>
      <View style={[styles.dot, { backgroundColor: colors.band[color] }]} />
      <Text style={styles.label}>
        {color} · {BAND_KG[color]} kg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
    textTransform: 'capitalize',
  },
});
