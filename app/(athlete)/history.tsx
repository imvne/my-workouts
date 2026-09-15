import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { getSession } from '@/data/programming';
import { useWorkoutStore } from '@/store/workoutStore';

export default function HistoryScreen() {
  const router = useRouter();
  const history = useWorkoutStore((s) => s.history);
  const clearHistory = useWorkoutStore((s) => s.clearHistory);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {history.length === 0 ? (
        <Text style={styles.empty}>Aucune séance terminée pour l’instant.</Text>
      ) : (
        history.map((log) => {
          const session = getSession(log.sessionId);
          const date = new Date(log.completedAt ?? log.startedAt);
          const doneCount = Object.values(log.exerciseLogs).filter(
            (e) => e.completedAt,
          ).length;
          return (
            <Pressable key={log.id} style={styles.row}>
              <Text style={styles.name}>{session?.name ?? log.sessionId}</Text>
              <Text style={styles.meta}>
                Semaine {log.week} · {doneCount} exos ·{' '}
                {date.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Pressable>
          );
        })
      )}

      {history.length > 0 ? (
        <Button title="Effacer l’historique" variant="ghost" onPress={clearHistory} />
      ) : (
        <Button title="Retour" variant="secondary" onPress={() => router.back()} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  empty: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: 16,
    marginVertical: spacing.xl,
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
});
