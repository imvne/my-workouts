import { StyleSheet, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { SetRow } from '@/components/workout/SetRow';
import { spacing } from '@/constants/theme';
import { formatLoad } from '@/lib/format';
import type { Exercise, WeekPrescription } from '@/types/workout';
import type { ExerciseLog } from '@/types/workout';

type Props = {
  exercise: Exercise;
  prescription: WeekPrescription;
  log: ExerciseLog;
  onToggleSet: (index: number) => void;
  onUpdateSet: (
    index: number,
    patch: { reps?: number | null; loadKg?: number | null },
  ) => void;
};

export function SetsRepsLogger({
  exercise,
  prescription,
  log,
  onToggleSet,
  onUpdateSet,
}: Props) {
  const targetLoad = formatLoad(prescription.load);
  const freeReps = prescription.reps == null;

  return (
    <View style={styles.list}>
      {log.sets.map((set, index) => (
        <SetRow
          key={`${exercise.id}-${index}`}
          index={index}
          label={`Série ${index + 1}`}
          detail={
            prescription.reps != null
              ? `${prescription.reps} reps · ${targetLoad}`
              : targetLoad
          }
          completed={set.completed}
          onToggle={() => onToggleSet(index)}
        >
          <View style={styles.fields}>
            <Field
              label="Reps"
              value={set.reps != null ? String(set.reps) : ''}
              onChangeText={(v) =>
                onUpdateSet(index, {
                  reps: v === '' ? null : Number(v.replace(',', '.')),
                })
              }
              placeholder={freeReps ? 'saisir' : String(prescription.reps)}
              keyboardType="numeric"
            />
            <Field
              label="Charge (kg)"
              value={set.loadKg != null ? String(set.loadKg) : ''}
              onChangeText={(v) =>
                onUpdateSet(index, {
                  loadKg: v === '' ? null : Number(v.replace(',', '.')),
                })
              }
              placeholder={
                prescription.load?.type === 'kg'
                  ? String(prescription.load.value)
                  : '—'
              }
              keyboardType="decimal-pad"
            />
          </View>
        </SetRow>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  fields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
