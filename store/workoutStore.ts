import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { currentBlock, getSession } from '@/data/programming';
import { createId } from '@/lib/format';
import type { ExerciseLog, LoggedSet, SessionLog } from '@/types/workout';

export type Role = 'athlete' | 'coach';

type WorkoutState = {
  hydrated: boolean;
  role: Role;
  currentWeek: number;
  history: SessionLog[];
  activeSession: SessionLog | null;

  setHydrated: (value: boolean) => void;
  setRole: (role: Role) => void;
  setCurrentWeek: (week: number) => void;

  startSession: (sessionId: string) => void;
  updateExerciseLog: (exerciseId: string, patch: Partial<ExerciseLog>) => void;
  updateSet: (exerciseId: string, setIndex: number, patch: Partial<LoggedSet>) => void;
  completeExercise: (exerciseId: string) => void;
  finishSession: () => void;
  abandonSession: () => void;
  clearHistory: () => void;
};

function emptySets(count: number, defaults?: Partial<LoggedSet>): LoggedSet[] {
  return Array.from({ length: count }, () => ({
    completed: false,
    reps: defaults?.reps ?? null,
    loadKg: defaults?.loadKg ?? null,
    band: defaults?.band ?? null,
    note: defaults?.note,
  }));
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      role: 'athlete',
      currentWeek: 1,
      history: [],
      activeSession: null,

      setHydrated: (value) => set({ hydrated: value }),
      setRole: (role) => set({ role }),
      setCurrentWeek: (week) =>
        set({
          currentWeek: Math.max(1, Math.min(week, currentBlock.weeks)),
        }),

      startSession: (sessionId) => {
        const session = getSession(sessionId);
        if (!session) return;
        const week = get().currentWeek;
        const exerciseLogs: Record<string, ExerciseLog> = {};

        for (const exercise of session.exercises) {
          const prescription = exercise.prescriptionByWeek[week - 1];
          let count = prescription?.sets ?? 3;
          if (exercise.format === 'pyramid' && prescription) {
            count =
              (prescription.pyramidTo ?? 7) - (prescription.pyramidFrom ?? 1) + 1;
          }
          if (exercise.format === 'emom' && prescription?.durationMin) {
            count = prescription.durationMin;
          }
          if (exercise.format === 'complex' && prescription?.rounds) {
            count = prescription.rounds;
          }

          const defaultReps =
            exercise.format === 'pyramid'
              ? (prescription?.pyramidFrom ?? 1)
              : (prescription?.targetReps ?? prescription?.reps ?? null);

          const defaultKg =
            prescription?.load?.type === 'kg' ? prescription.load.value : null;
          const defaultBand =
            prescription?.load?.type === 'band'
              ? prescription.load.color
              : exercise.band ?? null;

          exerciseLogs[exercise.id] = {
            exerciseId: exercise.id,
            sets: emptySets(count, {
              reps: defaultReps,
              loadKg: defaultKg,
              band: defaultBand,
            }).map((s, i) => {
              if (exercise.format === 'pyramid') {
                const from = prescription?.pyramidFrom ?? 1;
                return { ...s, reps: from + i };
              }
              if (exercise.format === 'emom') {
                return { ...s, reps: prescription?.targetReps ?? null };
              }
              return s;
            }),
            rpe: null,
            rir: null,
            estimated1rm: null,
          };
        }

        set({
          activeSession: {
            id: createId('session'),
            sessionId,
            week,
            startedAt: new Date().toISOString(),
            exerciseLogs,
          },
        });
      },

      updateExerciseLog: (exerciseId, patch) => {
        const active = get().activeSession;
        if (!active) return;
        const current = active.exerciseLogs[exerciseId];
        if (!current) return;
        set({
          activeSession: {
            ...active,
            exerciseLogs: {
              ...active.exerciseLogs,
              [exerciseId]: { ...current, ...patch },
            },
          },
        });
      },

      updateSet: (exerciseId, setIndex, patch) => {
        const active = get().activeSession;
        if (!active) return;
        const current = active.exerciseLogs[exerciseId];
        if (!current) return;
        const sets = current.sets.map((s, i) =>
          i === setIndex ? { ...s, ...patch } : s,
        );
        set({
          activeSession: {
            ...active,
            exerciseLogs: {
              ...active.exerciseLogs,
              [exerciseId]: { ...current, sets },
            },
          },
        });
      },

      completeExercise: (exerciseId) => {
        get().updateExerciseLog(exerciseId, {
          completedAt: new Date().toISOString(),
        });
      },

      finishSession: () => {
        const active = get().activeSession;
        if (!active) return;
        const completed: SessionLog = {
          ...active,
          completedAt: new Date().toISOString(),
        };
        set({
          activeSession: null,
          history: [completed, ...get().history],
        });
      },

      abandonSession: () => set({ activeSession: null }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'workouts-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        role: state.role,
        currentWeek: state.currentWeek,
        history: state.history,
        activeSession: state.activeSession,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
