import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SetRow } from '@/components/workout/SetRow';
import { colors, fonts, spacing } from '@/constants/theme';
import { formatLoad } from '@/lib/format';
import type { Exercise, WeekPrescription } from '@/types/workout';
import type { ExerciseLog } from '@/types/workout';

type Props = {
  exercise: Exercise;
  prescription: WeekPrescription;
  log: ExerciseLog;
  onToggleSet: (index: number) => void;
};

export function EmomLogger({
  exercise,
  prescription,
  log,
  onToggleSet,
}: Props) {
  const duration = prescription.durationMin ?? 10;
  const totalSeconds = duration * 60;
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const elapsed = totalSeconds - secondsLeft;
  const activeMinute = Math.min(duration, Math.floor(elapsed / 60) + 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.timerBlock}>
        <Text style={styles.timer}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>
        <Text style={styles.hint}>
          {prescription.targetReps ?? '?'} reps / min · {formatLoad(prescription.load)}
        </Text>
        <Text style={styles.minuteHint}>
          Minute {activeMinute} / {duration}
        </Text>
        <View style={styles.actions}>
          <Button
            title={running ? 'Pause' : secondsLeft === 0 ? 'Relancer' : 'Démarrer'}
            onPress={() => {
              if (secondsLeft === 0) setSecondsLeft(totalSeconds);
              setRunning((r) => !r);
            }}
            style={{ flex: 1 }}
          />
          <Button
            title="Reset"
            variant="ghost"
            onPress={() => {
              setRunning(false);
              setSecondsLeft(totalSeconds);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.list}>
        {log.sets.map((set, i) => (
          <SetRow
            key={`${exercise.id}-emom-${i}`}
            index={i}
            label={`Minute ${i + 1}`}
            detail={`${set.reps ?? prescription.targetReps ?? '?'} reps`}
            completed={set.completed}
            onToggle={() => onToggleSet(i)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  timerBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timer: {
    fontFamily: fonts.displayBold,
    fontSize: 56,
    color: colors.pinkDeep,
    letterSpacing: 2,
  },
  hint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
  minuteHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
