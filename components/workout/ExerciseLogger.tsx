import { SetsRepsLogger } from '@/components/workout/SetsRepsLogger';
import { PyramidLogger } from '@/components/workout/PyramidLogger';
import { EmomLogger } from '@/components/workout/EmomLogger';
import { ComplexLogger } from '@/components/workout/ComplexLogger';
import type { Exercise, ExerciseLog, WeekPrescription } from '@/types/workout';

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

export function ExerciseLogger({
  exercise,
  prescription,
  log,
  onToggleSet,
  onUpdateSet,
}: Props) {
  switch (exercise.format) {
    case 'pyramid':
      return (
        <PyramidLogger
          exercise={exercise}
          prescription={prescription}
          log={log}
          onToggleSet={onToggleSet}
        />
      );
    case 'emom':
      return (
        <EmomLogger
          exercise={exercise}
          prescription={prescription}
          log={log}
          onToggleSet={onToggleSet}
        />
      );
    case 'complex':
      return (
        <ComplexLogger
          exercise={exercise}
          prescription={prescription}
          log={log}
          onToggleSet={onToggleSet}
        />
      );
    case 'negatives':
    case 'sets_reps':
    case 'amrap':
    case 'for_time':
    case 'max_reps':
    default:
      return (
        <SetsRepsLogger
          exercise={exercise}
          prescription={prescription}
          log={log}
          onToggleSet={onToggleSet}
          onUpdateSet={onUpdateSet}
        />
      );
  }
}
