import { StyleSheet, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { spacing } from '@/constants/theme';
import type { Exercise } from '@/types/workout';
import type { ExerciseLog } from '@/types/workout';

type Props = {
  exercise: Exercise;
  log: ExerciseLog;
  onChange: (patch: Partial<ExerciseLog>) => void;
};

export function IntensityFields({ exercise, log, onChange }: Props) {
  if (!exercise.trackRpe && !exercise.trackRir && !exercise.track1rm) {
    return null;
  }

  return (
    <View style={styles.row}>
      {exercise.trackRpe ? (
        <Field
          label="RPE"
          value={log.rpe != null ? String(log.rpe) : ''}
          onChangeText={(v) =>
            onChange({ rpe: v === '' ? null : Number(v.replace(',', '.')) })
          }
          placeholder="ex. 7"
          keyboardType="decimal-pad"
        />
      ) : null}
      {exercise.trackRir ? (
        <Field
          label="RIR"
          value={log.rir != null ? String(log.rir) : ''}
          onChangeText={(v) =>
            onChange({ rir: v === '' ? null : Number(v.replace(',', '.')) })
          }
          placeholder="ex. 2"
          keyboardType="decimal-pad"
        />
      ) : null}
      {exercise.track1rm ? (
        <Field
          label="1RM estimé"
          value={log.estimated1rm != null ? String(log.estimated1rm) : ''}
          onChangeText={(v) =>
            onChange({
              estimated1rm: v === '' ? null : Number(v.replace(',', '.')),
            })
          }
          placeholder="kg"
          keyboardType="decimal-pad"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
