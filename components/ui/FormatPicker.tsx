import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { FORMATS } from '@/lib/formats';
import type { ExerciseFormat } from '@/types/program';

/** Rangée de choix de format, affichée sous la ligne quand on touche la cellule « Format ». */
export function FormatPicker({
  value,
  onPick,
}: {
  value: ExerciseFormat;
  onPick: (f: ExerciseFormat) => void;
}) {
  return (
    <View style={styles.row}>
      {FORMATS.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onPick(f.key)}
          style={[styles.chip, value === f.key && styles.chipOn]}
        >
          <Text style={[styles.text, value === f.key && styles.textOn]}>{f.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FormatTag({ format }: { format: ExerciseFormat }) {
  const label = FORMATS.find((f) => f.key === format)?.label ?? 'Séries';
  return (
    <View style={[styles.tag, format !== 'sets' && styles.tagTimed]}>
      <Text numberOfLines={1} style={[styles.tagText, format !== 'sets' && styles.tagTextTimed]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundAlt,
  },
  chipOn: { backgroundColor: colors.text },
  text: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  textOn: { color: colors.white },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundAlt,
  },
  tagTimed: { backgroundColor: colors.pinkSoft },
  tagText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
  tagTextTimed: { color: colors.pinkDeep },
});
