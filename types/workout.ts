export type BandColor = 'bleu' | 'vert' | 'jaune';

export type ExerciseFormat =
  | 'sets_reps'
  | 'pyramid'
  | 'emom'
  | 'amrap'
  | 'for_time'
  | 'max_reps'
  | 'negatives'
  | 'complex';

export type LoadSpec =
  | { type: 'kg'; value: number }
  | { type: 'band'; color: BandColor }
  | { type: 'bodyweight' }
  | { type: 'band_plus_body'; color?: BandColor }
  | { type: 'free' };

export type SetPrescription = {
  reps?: number | null;
  load?: LoadSpec | null;
  note?: string;
};

export type WeekPrescription = {
  /** Target sets for classic sets_reps / negatives */
  sets?: number;
  /** Same reps for every set */
  reps?: number | null;
  /** Per-set overrides (length = sets) */
  setDetails?: SetPrescription[];
  /** Single load for the week */
  load?: LoadSpec | null;
  /** EMOM duration in minutes */
  durationMin?: number;
  /** EMOM / AMRAP target reps per minute or total */
  targetReps?: number | null;
  /** Pyramid: from → to */
  pyramidFrom?: number;
  pyramidTo?: number;
  /** Complex rounds */
  rounds?: number;
  movements?: ComplexMovement[];
  notes?: string;
};

export type ComplexMovement = {
  name: string;
  reps: number;
  load?: LoadSpec | null;
};

export type Exercise = {
  id: string;
  name: string;
  format: ExerciseFormat;
  prescriptionByWeek: WeekPrescription[];
  band?: BandColor | null;
  notes?: string;
  trackRpe?: boolean;
  trackRir?: boolean;
  track1rm?: boolean;
};

export type Session = {
  id: string;
  name: string;
  order: number;
  exercises: Exercise[];
};

export type Block = {
  id: string;
  name: string;
  weeks: number;
  sessions: Session[];
};

/** Logged set during a workout */
export type LoggedSet = {
  completed: boolean;
  reps?: number | null;
  loadKg?: number | null;
  band?: BandColor | null;
  note?: string;
};

export type ExerciseLog = {
  exerciseId: string;
  sets: LoggedSet[];
  rpe?: number | null;
  rir?: number | null;
  estimated1rm?: number | null;
  notes?: string;
  completedAt?: string;
};

export type SessionLog = {
  id: string;
  sessionId: string;
  week: number;
  startedAt: string;
  completedAt?: string;
  exerciseLogs: Record<string, ExerciseLog>;
};
