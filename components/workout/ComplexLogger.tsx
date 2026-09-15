import { StyleSheet, Text, View } from 'react-native';

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

export function ComplexLogger({
  exercise,
  prescription,
  log,
  onToggleSet,
}: Props) {
  const movements = prescription.movements ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.movements}>
        {movements.map((m) => (
          <Text key={m.name} style={styles.movement}>
            {m.reps} {m.name}
            {m.load ? ` · ${formatLoad(m.load)}` : ''}
          </Text>
        ))}
      </View>
      <View style={styles.list}>
        {log.sets.map((set, index) => (
          <SetRow
            key={`${exercise.id}-cx-${index}`}
            index={index}
            label={`Round ${index + 1}`}
            detail="Valider le tour complet"
            completed={set.completed}
            onToggle={() => onToggleSet(index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  movements: {
    gap: spacing.xs,
  },
  movement: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  list: {
    gap: spacing.sm,
  },
});
