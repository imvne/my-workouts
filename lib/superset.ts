import type { ProgramExercise } from '@/types/program';

/** Bornes [début, fin] du superset contenant l'exo `i` (un exo seul = groupe d'un). */
export function groupBounds(exercises: ProgramExercise[], i: number): [number, number] {
  let start = i;
  while (start > 0 && exercises[start - 1].linkNext) start--;
  let end = i;
  while (end < exercises.length - 1 && exercises[end].linkNext) end++;
  return [start, end];
}

export type Step = { exercise: number; set: number; roundEnd: boolean };

/**
 * Étape suivante dans le groupe : exo suivant à la même série, sinon on revient au début
 * du groupe pour la série d'après (fin de tour → repos). `null` = groupe terminé.
 */
export function nextStep(exercises: ProgramExercise[], ei: number, set: number): Step | null {
  const [start, end] = groupBounds(exercises, ei);
  for (let j = ei + 1; j <= end; j++) if (exercises[j].sets > set) return { exercise: j, set, roundEnd: false };
  for (let j = start; j <= end; j++)
    if (exercises[j].sets > set + 1) return { exercise: j, set: set + 1, roundEnd: true };
  return null;
}

/** Étape précédente dans le groupe, `null` si on est au tout début du groupe. */
export function prevStep(exercises: ProgramExercise[], ei: number, set: number): Step | null {
  const [start, end] = groupBounds(exercises, ei);
  for (let j = ei - 1; j >= start; j--) if (exercises[j].sets > set) return { exercise: j, set, roundEnd: false };
  if (set === 0) return null;
  for (let j = end; j >= start; j--)
    if (exercises[j].sets > set - 1) return { exercise: j, set: set - 1, roundEnd: true };
  return null;
}
