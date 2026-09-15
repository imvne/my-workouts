import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

type Props = {
  index: number;
  label: string;
  completed: boolean;
  onToggle: () => void;
  detail?: string;
  children?: ReactNode;
};

export function SetRow({ index, label, completed, onToggle, detail, children }: Props) {
  return (
    <View style={[styles.row, completed && styles.rowDone]}>
      <Pressable onPress={onToggle} style={styles.checkArea} accessibilityRole="checkbox">
        <View style={[styles.checkbox, completed && styles.checkboxOn]}>
          {completed ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.label}>
            {label || `Série ${index + 1}`}
          </Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
      </Pressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowDone: {
    borderColor: colors.pink,
    backgroundColor: colors.pinkSoft + '55',
  },
  checkArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxOn: {
    backgroundColor: colors.pinkDeep,
    borderColor: colors.pinkDeep,
  },
  checkMark: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
});
