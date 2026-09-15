export type ProgramExercise = {
  id: string;
  name: string;
  sets: number;
  /** weeks[i] = difficulté / consigne pour la semaine i+1. Seule la semaine 1 est requise. */
  weeks: string[];
};

export type ProgramSession = {
  id: string;
  title: string;
  exercises: ProgramExercise[];
};

export type Program = {
  weeks: number;
  sessions: ProgramSession[];
};

export type ProgramProgress = {
  week: number; // 1-based
  session: number; // 0-based
  exercise: number; // 0-based
  set: number; // 0-based
};
