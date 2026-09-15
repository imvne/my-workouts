import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BandBadge } from '@/components/ui/BandBadge';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { getSession, getWeekPrescription } from '@/data/programming';
import { formatPrescriptionSummary } from '@/lib/format';
import { useWorkoutStore } from '@/store/workoutStore';

export default function SessionPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentWeek = useWorkoutStore((s) => s.currentWeek);
  const startSession = useWorkoutStore((s) => s.startSession);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const abandonSession = useWorkoutStore((s) => s.abandonSession);

  const session = getSession(id);

  if (!session) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Séance introuvable.</Text>
      </View>
    );
  }

  const begin = () => {
    if (activeSession && activeSession.sessionId !== session.id) {
      abandonSession();
    }
    if (!activeSession || activeSession.sessionId !== session.id) {
      startSession(session.id);
    }
    router.push(`/(athlete)/session/${session.id}/run`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{session.name}</Text>
      <Text style={styles.subtitle}>Semaine {currentWeek} du bloc</Text>

      <View style={styles.list}>
        {session.exercises.map((exercise, index) => {
          const prescription = getWeekPrescription(exercise, currentWeek);
          return (
            <View key={exercise.id} style={styles.item}>
              <Text style={styles.index}>{index + 1}</Text>
              <View style={styles.itemBody}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={styles.prescription}>
                  {formatPrescriptionSummary(prescription)}
                </Text>
                {exercise.band ? <BandBadge color={exercise.band} /> : null}
                {exercise.notes ? (
                  <Text style={styles.notes}>{exercise.notes}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Button title="Commencer la séance" onPress={begin} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  index: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.pinkDeep,
    width: 28,
  },
  itemBody: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  prescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  notes: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  missingText: {
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
