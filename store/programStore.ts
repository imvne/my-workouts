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

/** Clé d'un exo fait : semaine + ids de séance et d'exo (stable si on réordonne). */
export function doneKey(week: number, sessionId: string, exerciseId: string): string {
  return `${week}:${sessionId}:${exerciseId}`;
}

type ProgramState = {
  program: Program | null;
  progress: ProgramProgress;
  /** Exos cochés, indépendamment de la position (on peut en sauter). */
  done: Record<string, true>;
  /** La séance courante a été lancée (sinon on affiche l'écran « Commencer la séance »). */
  sessionStarted: boolean;
  saveProgram: (program: Program) => void;
  /** Fusionne avec la prog existante : les séances de même titre sont remplacées, les autres gardées. */
  importProgram: (program: Program, progress: ProgramProgress, done?: string[]) => void;
  clearProgram: () => void;
  setProgress: (progress: ProgramProgress, started?: boolean) => void;
  startSession: () => void;
  setDone: (keys: string[], value: boolean) => void;
};

function sameTitle(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Ne garde que les clés d'exos qui existent encore. */
function pruneDone(program: Program, done: Record<string, true>): Record<string, true> {
  const valid = new Set<string>();
  for (let week = 1; week <= program.weeks; week++) {
    for (const s of program.sessions) for (const e of s.exercises) valid.add(doneKey(week, s.id, e.id));
  }
  return Object.fromEntries(Object.keys(done).filter((k) => valid.has(k)).map((k) => [k, true]));
}

function mergePrograms(
  existing: Program,
  incoming: Program,
): { program: Program; sessionIdMap: Map<string, string> } {
  const weeks = Math.max(existing.weeks, incoming.weeks);
  const sessions = existing.sessions.map((s) => ({ ...s }));
  const sessionIdMap = new Map<string, string>(); // id entrant → id final
  for (const inc of incoming.sessions) {
    const idx = sessions.findIndex((s) => sameTitle(s.title, inc.title));
    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], exercises: inc.exercises };
      sessionIdMap.set(inc.id, sessions[idx].id);
    } else {
      sessions.push(inc);
      sessionIdMap.set(inc.id, inc.id);
    }
  }
  const program: Program = {
    weeks,
    sessions: sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        weeks: Array.from({ length: weeks }, (_, i) => e.weeks[i] ?? ''),
      })),
    })),
  };
  return { program, sessionIdMap };
}

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
      done: {},
      sessionStarted: false,
      saveProgram: (program) =>
        set((state) => {
          const normalized = normalizeProgram(program);
          return { program: normalized, progress: clampProgress(normalized, state.progress) };
        }),
      importProgram: (program, progress, done = []) =>
        set((state) => {
          const incoming = normalizeProgram(program);
          if (!state.program) {
            return {
              program: incoming,
              progress: clampProgress(incoming, progress),
              done: pruneDone(incoming, Object.fromEntries(done.map((k) => [k, true]))),
              sessionStarted: false,
            };
          }
          const { program: merged, sessionIdMap } = mergePrograms(
            normalizeProgram(state.program),
            incoming,
          );
          const nextDone: Record<string, true> = { ...state.done };
          for (const k of done) {
            const [week, sid, eid] = k.split(':');
            const mapped = sessionIdMap.get(sid);
            if (mapped) nextDone[`${week}:${mapped}:${eid}`] = true;
          }
          return {
            program: merged,
            progress: clampProgress(merged, state.progress),
            done: pruneDone(merged, nextDone),
          };
        }),
      clearProgram: () =>
        set({ program: null, progress: initialProgress, done: {}, sessionStarted: false }),
      setProgress: (progress, started = false) => set({ progress, sessionStarted: started }),
      startSession: () => set({ sessionStarted: true }),
      setDone: (keys, value) =>
        set((state) => {
          const done = { ...state.done };
          for (const k of keys) {
            if (value) done[k] = true;
            else delete done[k];
          }
          return { done };
        }),
    }),
    {
      name: 'workouts-program-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
