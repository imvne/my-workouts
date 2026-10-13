export type ExerciseFormat = 'sets' | 'emom' | 'amrap' | 'fortime' | 'circuit';

export type ProgramExercise = {
  id: string;
  name: string;
  /** Absent = déduit du nom (« pull up emom » → EMOM). */
  format?: ExerciseFormat;
  sets: number;
  /** Une seule valeur = commune à toutes les séries ; sinon une valeur par série. */
  reps: string[];
  loads: string[];
};

export type ProgramSession = {
  id: string;
  title: string;
  exercises: ProgramExercise[];
};

/** Chaque semaine a ses propres séances : modifier l'une ne touche pas les autres. */
export type ProgramWeek = {
  id: string;
  sessions: ProgramSession[];
};

export type Program = {
  weeks: ProgramWeek[];
};

export type ProgramProgress = {
  week: number; // 1-based
  session: number; // 0-based
  exercise: number; // 0-based
  set: number; // 0-based
};

/** Exo de la bibliothèque, proposé quand on tape un nom. */
export type LibraryItem = {
  id: string;
  name: string;
  format: ExerciseFormat;
};
