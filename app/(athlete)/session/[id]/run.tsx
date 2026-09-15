import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BandBadge } from '@/components/ui/BandBadge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ExerciseLogger } from '@/components/workout/ExerciseLogger';
import { IntensityFields } from '@/components/workout/IntensityFields';
import { colors, fonts, spacing } from '@/constants/theme';
import { getSession, getWeekPrescription } from '@/data/programming';
import { formatPrescriptionSummary } from '@/lib/format';
import { useWorkoutStore } from '@/store/workoutStore';

export default function SessionRun() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const activeSession = useWorkoutStore((s) => s.activeSession);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const updateExerciseLog = useWorkoutStore((s) => s.updateExerciseLog);
  const completeExercise = useWorkoutStore((s) => s.completeExercise);
  const finishSession = useWorkoutStore((s) => s.finishSession);
  const abandonSession = useWorkoutStore((s) => s.abandonSession);
  const startSession = useWorkoutStore((s) => s.startSession);

  const session = getSession(id);

  useEffect(() => {
    if (!session) return;
    const current = useWorkoutStore.getState().activeSession;
    if (!current || current.sessionId !== session.id) {
      startSession(session.id);
    }
  }, [session?.id, startSession]);

  const live = activeSession;

  if (!session || !live || live.sessionId !== session.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Préparation de la séance…</Text>
        <Button title="Retour" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const exercises = session.exercises;
  const exercise = exercises[index];
  const week = live.week;
  const prescription = getWeekPrescription(exercise, week);
  const log = live.exerciseLogs[exercise.id];
  const progress = (index + 0.2) / exercises.length;

  const toggleSet = (setIndex: number) => {
    const current = log.sets[setIndex];
    updateSet(exercise.id, setIndex, { completed: !current.completed });
  };

  const onValidate = () => {
    completeExercise(exercise.id);
    if (index >= exercises.length - 1) {
      setFinished(true);
      finishSession();
      return;
    }
    setIndex((i) => i + 1);
  };

  const confirmQuit = () => {
    abandonSession();
    router.replace('/(athlete)');
  };

  const onQuit = () => {
    if (Platform.OS === 'web') {
      // window.confirm works on web where Alert.alert is limited
      if (typeof window !== 'undefined' && window.confirm('Quitter la séance ? La progression en cours sera abandonnée.')) {
        confirmQuit();
      }
      return;
    }
    Alert.alert('Quitter la séance ?', 'La progression en cours sera abandonnée.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: confirmQuit,
      },
    ]);
  };

  if (finished) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>Séance terminée</Text>
        <Text style={styles.doneText}>
          {session.name} · semaine {week} enregistrée.
        </Text>
        <Button title="Retour au bloc" onPress={() => router.replace('/(athlete)')} />
        <Button
          title="Voir l’historique"
          variant="ghost"
          onPress={() => router.replace('/(athlete)/history')}
        />
      </View>
    );
  }

  if (!log) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Chargement de l’exercice…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.top}>
        <Text style={styles.progressLabel}>
          Exercice {index + 1} / {exercises.length}
        </Text>
        <ProgressBar progress={progress} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.format}>{exercise.format.replace('_', ' ')}</Text>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.summary}>{formatPrescriptionSummary(prescription)}</Text>
        {exercise.band ? <BandBadge color={exercise.band} /> : null}
        {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}

        <View style={styles.logger}>
          <ExerciseLogger
            exercise={exercise}
            prescription={prescription}
            log={log}
            onToggleSet={toggleSet}
            onUpdateSet={(setIndex, patch) => updateSet(exercise.id, setIndex, patch)}
          />
        </View>

        <IntensityFields
          exercise={exercise}
          log={log}
          onChange={(patch) => updateExerciseLog(exercise.id, patch)}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Valider l’exercice" onPress={onValidate} />
        <Button title="Quitter" variant="ghost" onPress={onQuit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  progressLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  format: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.text,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  notes: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  logger: {
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  muted: {
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  done: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  doneTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: colors.pinkDeep,
  },
  doneText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
});
