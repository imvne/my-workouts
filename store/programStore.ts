import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/format';
import type { Program, ProgramExercise, ProgramProgress, ProgramSession } from '@/types/program';

export const DEFAULT_WEEKS = 4;
export const DEFAULT_SESSIONS = 4;
export const DEFAULT_SETS = 3;

export function newExercise(weeks: number): ProgramExercise {
  return {
    id: createId('ex'),
    name: '',
    sets: DEFAULT_SETS,
    weeks: Array.from({ length: weeks }, () => ''),
  };
}

export function newSession(weeks: number, index: number): ProgramSession {
  return { id: createId('s'), title: `Séance ${index + 1}`, exercises: [newExercise(weeks)] };
}

export function newProgram(weeks = DEFAULT_WEEKS, sessions = DEFAULT_SESSIONS): Program {
  return { weeks, sessions: Array.from({ length: sessions }, (_, i) => newSession(weeks, i)) };
}

/** Programmes sauvegardés avant l'ajout des titres / séries. */
export function normalizeProgram(program: Program): Program {
  return {
    ...program,
    sessions: program.sessions.map((s, i) => ({
      ...s,
      title: s.title || `Séance ${i + 1}`,
      exercises: s.exercises.map((e) => ({ ...e, sets: e.sets || DEFAULT_SETS })),
    })),
  };
}

/** Consigne de la semaine demandée, sinon la dernière semaine renseignée avant. */
export function difficultyFor(exercise: ProgramExercise, week: number): string {
  for (let i = Math.min(week, exercise.weeks.length) - 1; i >= 0; i--) {
    const text = exercise.weeks[i]?.trim();
    if (text) return text;
  }
  return '';
}

type ProgramState = {
  program: Program | null;
  progress: ProgramProgress;
  saveProgram: (program: Program) => void;
  importProgram: (program: Program, progress: ProgramProgress) => void;
  clearProgram: () => void;
  setProgress: (progress: ProgramProgress) => void;
};

const initialProgress: ProgramProgress = { week: 1, session: 0, exercise: 0, set: 0 };

function clampProgress(program: Program, p: ProgramProgress): ProgramProgress {
  const week = Math.min(Math.max(1, p.week), program.weeks);
  const session = Math.min(Math.max(0, p.session), Math.max(0, program.sessions.length - 1));
  const count = program.sessions[session]?.exercises.length ?? 0;
  const exercise = Math.min(Math.max(0, p.exercise), Math.max(0, count - 1));
  const sets = program.sessions[session]?.exercises[exercise]?.sets ?? 1;
  const set = Math.min(Math.max(0, p.set ?? 0), Math.max(0, sets - 1));
  return { week, session, exercise, set };
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      program: null,
      progress: initialProgress,
      saveProgram: (program) =>
        set((state) => {
          const normalized = normalizeProgram(program);
          return { program: normalized, progress: clampProgress(normalized, state.progress) };
        }),
      importProgram: (program, progress) => {
        const normalized = normalizeProgram(program);
        set({ program: normalized, progress: clampProgress(normalized, progress) });
      },
      clearProgram: () => set({ program: null, progress: initialProgress }),
      setProgress: (progress) => set({ progress }),
    }),
    {
      name: 'workouts-program-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
