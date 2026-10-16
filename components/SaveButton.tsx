import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { saveNow, useSyncStore } from '@/lib/sync';

/** État de la sauvegarde Supabase + envoi immédiat. */
export function SaveButton() {
  const status = useSyncStore((s) => s.status);
  if (status === 'saving') {
    return <ActivityIndicator color={colors.pinkDeep} style={styles.spinner} />;
  }
  const label = status === 'dirty' ? 'Enregistrer' : status === 'error' ? 'Réessayer' : 'Enregistré ✓';
  const active = status !== 'saved';
  return (
    <Pressable
      onPress={saveNow}
      disabled={!active}
      hitSlop={8}
      style={[styles.btn, active && styles.btnOn, status === 'error' && styles.btnError]}
    >
      <Text style={[styles.text, active && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spinner: { width: 96 },
  btn: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: radii.sm },
  btnOn: { backgroundColor: colors.pinkDeep },
  btnError: { backgroundColor: '#C2410C' },
  text: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textLight },
  textOn: { color: colors.white, fontFamily: fonts.bodyBold },
});
