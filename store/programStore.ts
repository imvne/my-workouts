import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/format';
import type {
  Program,
  ProgramExercise,
  ProgramProgress,
  ProgramSession,
  ProgramWeek,
} from '@/types/program';

export const DEFAULT_SETS = 3;

export function newExercise(): ProgramExercise {
  return { id: createId('ex'), name: '', sets: DEFAULT_SETS, reps: [], loads: [] };
}

export function newSession(index: number): ProgramSession {
  return { id: createId('s'), title: `Séance ${index + 1}`, exercises: [newExercise()] };
}

export function newWeek(sessions = 1): ProgramWeek {
  return {
    id: createId('w'),
    sessions: Array.from({ length: sessions }, (_, i) => newSession(i)),
  };
}

export function newProgram(): Program {
  return { weeks: [newWeek(1)] };
}

export function cloneExercise(e: ProgramExercise): ProgramExercise {
  return { ...e, id: createId('ex'), reps: [...e.reps], loads: [...e.loads] };
}

export function cloneSession(s: ProgramSession): ProgramSession {
  return { ...s, id: createId('s'), exercises: s.exercises.map(cloneExercise) };
}

export function cloneWeek(w: ProgramWeek): ProgramWeek {
  return { id: createId('w'), sessions: w.sessions.map(cloneSession) };
}

/** Valeur d'une série : commune s'il n'y en a qu'une, sinon celle de la série. */
export function valueFor(values: string[] | undefined, setIndex: number): string {
  const arr = values ?? [];
  if (arr.length === 0) return '';
  return (arr.length === 1 ? arr[0] : (arr[setIndex] ?? '')) || '';
}

/** « 60 kg » si toutes les séries partagent la valeur, sinon « 60 · 65 · 70 ». */
export function summarize(values: string[] | undefined): string {
  const arr = (values ?? []).map((v) => v.trim()).filter(Boolean);
  if (arr.length === 0) return '';
  return new Set(arr).size === 1 ? arr[0] : arr.join(' · ');
}

export function sessionsOf(program: Program, week: number): ProgramSession[] {
  return program.weeks[week - 1]?.sessions ?? [];
}

function clampProgress(program: Program, p: ProgramProgress): ProgramProgress {
  const week = Math.min(Math.max(1, p.week), Math.max(1, program.weeks.length));
  const sessions = sessionsOf(program, week).filter((s) => s.exercises.length > 0);
  const session = Math.min(Math.max(0, p.session), Math.max(0, sessions.length - 1));
  const exercises = sessions[session]?.exercises ?? [];
  const exercise = Math.min(Math.max(0, p.exercise), Math.max(0, exercises.length - 1));
  const sets = exercises[exercise]?.sets ?? 1;
  const set = Math.min(Math.max(0, p.set ?? 0), Math.max(0, sets - 1));
  return { week, session, exercise, set };
}

function sameTitle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Les semaines/séances entrantes remplacent celles de même rang/titre, les autres restent. */
function mergePrograms(existing: Program, incoming: Program): Program {
  const weeks = existing.weeks.map((w) => ({ ...w, sessions: [...w.sessions] }));
  incoming.weeks.forEach((inc, i) => {
    if (!weeks[i]) {
      weeks[i] = inc;
      return;
    }
    for (const session of inc.sessions) {
      const idx = weeks[i].sessions.findIndex((s) => sameTitle(s.title, session.title));
      if (idx >= 0) weeks[i].sessions[idx] = session;
      else weeks[i].sessions.push(session);
    }
  });
  return { weeks };
}

function prune(program: Program, done: Record<string, true>): Record<string, true> {
  const ids = new Set<string>();
  for (const w of program.weeks) for (const s of w.sessions) for (const e of s.exercises) ids.add(e.id);
  return Object.fromEntries(Object.keys(done).filter((k) => ids.has(k)).map((k) => [k, true]));
}

type ProgramState = {
  program: Program | null;
  progress: ProgramProgress;
  /** Exos faits, par id : cochables indépendamment. */
  done: Record<string, true>;
  /** La séance courante est lancée (sinon écran « Commencer la séance »). */
  sessionStarted: boolean;
  saveProgram: (program: Program) => void;
  importProgram: (program: Program, progress: ProgramProgress, done?: string[]) => void;
  clearProgram: () => void;
  setProgress: (progress: ProgramProgress, started?: boolean) => void;
  startSession: () => void;
  setDone: (ids: string[], value: boolean) => void;
};

const initialProgress: ProgramProgress = { week: 1, session: 0, exercise: 0, set: 0 };

/** Ancien format : séances communes à tout le bloc, valeurs par semaine. */
function migrateV1(state: any): { program: Program | null; done: Record<string, true> } {
  const old = state?.program;
  if (!old?.sessions) return { program: null, done: {} };
  const pickWeek = (list: string[][] | undefined, week: number): string[] => {
    for (let i = Math.min(week, (list ?? []).length) - 1; i >= 0; i--) {
      const arr = (list?.[i] ?? []).map((v: string) => v.trim());
      if (arr.some(Boolean)) return arr;
    }
    return [];
  };
  const oldDone: Record<string, true> = state.done ?? {};
  const done: Record<string, true> = {};
  const weeks: ProgramWeek[] = [];
  for (let w = 1; w <= Math.max(1, old.weeks ?? 1); w++) {
    weeks.push({
      id: createId('w'),
      sessions: (old.sessions ?? []).map((s: any) => ({
        id: createId('s'),
        title: s.title ?? 'Séance',
        exercises: (s.exercises ?? []).map((e: any) => {
          const ex: ProgramExercise = {
            id: createId('ex'),
            name: e.name ?? '',
            sets: e.sets || DEFAULT_SETS,
            reps: pickWeek(e.reps, w),
            loads: pickWeek(e.loads, w),
          };
          if (oldDone[`${w}:${s.id}:${e.id}`]) done[ex.id] = true;
          return ex;
        }),
      })),
    });
  }
  return { program: { weeks }, done };
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      program: null,
      progress: initialProgress,
      done: {},
      sessionStarted: false,

      saveProgram: (program) =>
        set((state) => ({ program, progress: clampProgress(program, state.progress) })),

      importProgram: (program, progress, done = []) =>
        set((state) => {
          const incomingDone = Object.fromEntries(done.map((k) => [k, true as const]));
          if (!state.program) {
            return {
              program,
              progress: clampProgress(program, progress),
              done: prune(program, incomingDone),
              sessionStarted: false,
            };
          }
          const merged = mergePrograms(state.program, program);
          return {
            program: merged,
            progress: clampProgress(merged, state.progress),
            done: prune(merged, { ...state.done, ...incomingDone }),
          };
        }),

      clearProgram: () =>
        set({ program: null, progress: initialProgress, done: {}, sessionStarted: false }),

      setProgress: (progress, started = false) => set({ progress, sessionStarted: started }),
      startSession: () => set({ sessionStarted: true }),

      setDone: (ids, value) =>
        set((state) => {
          const done = { ...state.done };
          for (const id of ids) {
            if (value) done[id] = true;
            else delete done[id];
          }
          return { done };
        }),
    }),
    {
      name: 'workouts-program-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version) => {
        if (version >= 2) return persisted;
        const { program, done } = migrateV1(persisted);
        return { ...persisted, program, done, sessionStarted: false };
      },
    },
  ),
);
