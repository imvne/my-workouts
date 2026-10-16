import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Icône « récap » : trois lignes cochées. */
export function RecapIcon({ color = colors.text }: { color?: string }) {
  return (
    <View style={styles.box}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <View style={[styles.line, { backgroundColor: color }, i === 2 && styles.short]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 20, gap: 3.5, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 3.5, height: 3.5, borderRadius: 2 },
  line: { flex: 1, height: 2, borderRadius: 1 },
  short: { flex: 0.6 },
});
