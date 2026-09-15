import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/constants/theme';

type Props = {
  progress: number;
};

export function ProgressBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.pinkSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.pinkDeep,
    borderRadius: radii.pill,
  },
});
