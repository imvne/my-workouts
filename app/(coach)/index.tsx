import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

export default function CoachHome() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bientôt</Text>
      <Text style={styles.text}>
        L’espace coach permettra de créer et d’éditer les blocs. Pour l’instant, on se
        concentre sur l’espace coaché.
      </Text>
      <Button title="Retour" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    color: colors.pinkDeep,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
