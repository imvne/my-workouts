import { StyleSheet, View } from 'react-native';

import { SetRow } from '@/components/workout/SetRow';
import { spacing } from '@/constants/theme';
import type { Exercise, WeekPrescription } from '@/types/workout';
import type { ExerciseLog } from '@/types/workout';

type Props = {
  exercise: Exercise;
  prescription: WeekPrescription;
  log: ExerciseLog;
  onToggleSet: (index: number) => void;
};

export function PyramidLogger({
  exercise,
  prescription,
  log,
  onToggleSet,
}: Props) {
  const from = prescription.pyramidFrom ?? 1;

  return (
    <View style={styles.list}>
      {log.sets.map((set, index) => {
        const reps = set.reps ?? from + index;
        return (
          <SetRow
            key={`${exercise.id}-pyr-${index}`}
            index={index}
            label={`${reps} rep${reps > 1 ? 's' : ''}`}
            detail={`Niveau ${from + index}`}
            completed={set.completed}
            onToggle={() => onToggleSet(index)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
