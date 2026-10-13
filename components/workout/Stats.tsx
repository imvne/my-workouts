import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';

/** Taille du chiffre selon la longueur : « 8 » très gros, « pdc + bleu » plus petit. */
function sizeFor(value: string, big: boolean) {
  const n = value.length;
  if (!big) return n <= 6 ? 30 : n <= 12 ? 22 : 18;
  return n <= 4 ? 64 : n <= 7 ? 48 : n <= 11 ? 34 : 26;
}

function Stat({ value, label, accent, big }: { value: string; label: string; accent?: boolean; big: boolean }) {
  const size = sizeFor(value, big);
  return (
    <View style={styles.stat}>
      <Text
        numberOfLines={2}
        style={[styles.value, { fontSize: size, lineHeight: Math.round(size * 1.08) }, accent && styles.accent]}
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** Ce qu'il faut faire maintenant : reps et charge, côte à côte, en grand. */
export function Stats({ reps, load, big = true }: { reps: string; load: string; big?: boolean }) {
  if (!reps && !load) return null;
  return (
    <View style={styles.row}>
      {!!reps && <Stat value={reps} label="Reps" big={big} />}
      {!!reps && !!load && <View style={[styles.divider, !big && styles.dividerSmall]} />}
      {!!load && <Stat value={load} label="Charge" accent big={big} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', alignSelf: 'stretch' },
  stat: { flex: 1, maxWidth: 220, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  value: {
    fontFamily: fonts.displayBold,
    letterSpacing: -1.5,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  accent: { color: colors.pinkDeep },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  divider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md, marginVertical: spacing.sm },
  dividerSmall: { marginVertical: spacing.xs },
});
