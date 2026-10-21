import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createId } from '@/lib/format';
import type {
  LibraryItem,
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

const isDefaultTitle = (t: string) => /^\s*s[ée]ance\s*\d*\s*$/i.test(t);

/** Séance équivalente la semaine d'avant : même titre, sinon même position. */
export function previousWeekSession(program: Program, wi: number, sessionId: string): ProgramSession | null {
  if (wi <= 0) return null;
  const current = program.weeks[wi]?.sessions ?? [];
  const index = current.findIndex((s) => s.id === sessionId);
  const target = current[index];
  const prev = program.weeks[wi - 1]?.sessions ?? [];
  if (!target) return null;
  const key = target.title.trim().toLowerCase();
  const match = (!isDefaultTitle(target.title) && prev.find((s) => s.title.trim().toLowerCase() === key)) || prev[index];
  return match && match.exercises.some((e) => e.name.trim()) ? match : null;
}

/** Remplace les exos d'une séance par une copie de la séance de la semaine d'avant. */
export function copyPreviousWeekSession(program: Program, wi: number, sessionId: string): Program | null {
  const src = previousWeekSession(program, wi, sessionId);
  if (!src) return null;
  const copy = cloneSession(src);
  return {
    weeks: program.weeks.map((w, i) =>
      i !== wi
        ? w
        : {
            ...w,
            sessions: w.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, title: isDefaultTitle(s.title) ? src.title : s.title, exercises: copy.exercises }
                : s,
            ),
          },
    ),
  };
}

/** Valeur d'une série : commune s'il n'y en a qu'une, sinon celle de la série (ou la dernière). */
export function valueFor(values: string[] | undefined, setIndex: number): string {
  const arr = (values ?? []).map((v) => v.trim());
  if (arr.length === 0) return '';
  return arr[Math.min(setIndex, arr.length - 1)] ?? '';
}

/** Cellule « tableur » : les valeurs par série sont séparées par « / ». */
export const SERIES_SEP = '/';
export const seriesToText = (values: string[]) => values.join(SERIES_SEP);
export const textToSeries = (text: string) => (text === '' ? [] : text.split(SERIES_SEP));

/** « 60 kg » si toutes les séries partagent la valeur, sinon « 60 · 65 · 70 ». */
export function summarize(values: string[] | undefined): string {
  const arr = (values ?? []).map((v) => v.trim()).filter(Boolean);
  if (arr.length === 0) return '';
  return new Set(arr).size === 1 ? arr[0] : arr.join(' · ');
}

/** Séances jouables d'une semaine : exos sans nom ignorés, séances vides retirées. */
export function sessionsOf(program: Program, week: number): ProgramSession[] {
  return (program.weeks[week - 1]?.sessions ?? [])
    .map((s) => ({ ...s, exercises: s.exercises.filter((e) => e.name.trim()) }))
    .filter((s) => s.exercises.length > 0);
}

function clampProgress(program: Program, p: ProgramProgress): ProgramProgress {
  const week = Math.min(Math.max(1, p.week), Math.max(1, program.weeks.length));
  const sessions = sessionsOf(program, week);
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

export type Settings = {
  /** Jour où commence la semaine d'entraînement (0 = dimanche … 6 = samedi). */
  weekStartDay: number;
  /** Décompte avant un chrono (s). */
  prepSeconds: number;
  sound: boolean;
  /** Repos utilisé quand l'exo n'en précise pas (« 90 », « 1:30 »…). */
  defaultRest: string;
};

export const DEFAULT_SETTINGS: Settings = { weekStartDay: 1, prepSeconds: 10, sound: true, defaultRest: '' };

/** Résultat d'un chrono (For Time, AMRAP, EMOM…), gardé pour y revenir. */
export type TimerResult = { ms: number; reps: number; finished: boolean; at: number };

export type SessionLog = { startedAt?: number; finishedAt?: number };

type ProgramState = {
  program: Program | null;
  progress: ProgramProgress;
  /** Exos faits, par id : cochables indépendamment. */
  done: Record<string, true>;
  /** Exos volontairement non faits : on ne revient pas dessus. */
  skipped: Record<string, true>;
  results: Record<string, TimerResult>;
  /** Début / fin de chaque séance (par id de séance). */
  log: Record<string, SessionLog>;
  settings: Settings;
  /** La séance courante est lancée (sinon écran « Commencer la séance »). */
  sessionStarted: boolean;
  library: LibraryItem[];
  saveProgram: (program: Program) => void;
  importProgram: (program: Program, progress: ProgramProgress, done?: string[]) => void;
  clearProgram: () => void;
  setProgress: (progress: ProgramProgress, started?: boolean) => void;
  startSession: () => void;
  setDone: (ids: string[], value: boolean) => void;
  setSkipped: (ids: string[], value: boolean) => void;
  setResult: (id: string, result: TimerResult | null) => void;
  markSessionStarted: (sessionId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addLibraryItem: (item: Omit<LibraryItem, 'id'>) => void;
  updateLibraryItem: (id: string, patch: Partial<LibraryItem>) => void;
  removeLibraryItem: (id: string) => void;
  /** Remplace tout l'état par la version du cloud. */
  hydrateCloud: (data: CloudData) => void;
  /** Vide tout (déconnexion). */
  resetAll: () => void;
};

/** Ce qui est sauvegardé dans Supabase. */
export type CloudData = {
  program: Program | null;
  progress: ProgramProgress;
  done: Record<string, true>;
  skipped?: Record<string, true>;
  results?: Record<string, TimerResult>;
  log?: Record<string, SessionLog>;
  settings?: Settings;
  sessionStarted: boolean;
  library: LibraryItem[];
};

export function snapshot(): CloudData {
  const { program, progress, done, skipped, results, log, settings, sessionStarted, library } =
    useProgramStore.getState();
  return { program, progress, done, skipped, results, log, settings, sessionStarted, library };
}

/** Exo traité = fait ou volontairement pas fait. */
export const isTreated = (id: string, done: Record<string, true>, skipped: Record<string, true>) =>
  !!done[id] || !!skipped[id];

/** Prochaine position : premier exo ni fait ni « pas fait » dans l'ordre du bloc (null = bloc fini). */
export function firstUntreated(
  program: Program,
  done: Record<string, true>,
  skipped: Record<string, true>,
): ProgramProgress | null {
  for (let week = 1; week <= program.weeks.length; week++) {
    const sessions = sessionsOf(program, week);
    for (let si = 0; si < sessions.length; si++)
      for (let ei = 0; ei < sessions[si].exercises.length; ei++)
        if (!isTreated(sessions[si].exercises[ei].id, done, skipped)) return { week, session: si, exercise: ei, set: 0 };
  }
  return null;
}

/** Début de la semaine suivante (jour de début réglé), strictement après `date`. */
export function nextWeekStart(date: number, weekStartDay: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== weekStartDay);
  return d;
}

/** Date de fin d'une séance : posée quand tous ses exos sont traités, retirée sinon. */
function refreshLog(
  program: Program | null,
  done: Record<string, true>,
  skipped: Record<string, true>,
  log: Record<string, SessionLog>,
): Record<string, SessionLog> {
  if (!program) return log;
  const next = { ...log };
  const now = Date.now();
  for (const w of program.weeks) {
    for (const s of w.sessions) {
      const ids = s.exercises.filter((e) => e.name.trim()).map((e) => e.id);
      if (ids.length === 0) continue;
      const all = ids.every((id) => isTreated(id, done, skipped));
      const entry = next[s.id] ?? {};
      if (all && !entry.finishedAt) next[s.id] = { ...entry, finishedAt: now };
      if (!all && entry.finishedAt) next[s.id] = { startedAt: entry.startedAt };
    }
  }
  return next;
}

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
      skipped: {},
      results: {},
      log: {},
      settings: DEFAULT_SETTINGS,
      sessionStarted: false,
      library: [],

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

      addLibraryItem: (item) =>
        set((state) => ({ library: [...state.library, { ...item, id: createId('lib') }] })),
      updateLibraryItem: (id, patch) =>
        set((state) => ({ library: state.library.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeLibraryItem: (id) => set((state) => ({ library: state.library.filter((l) => l.id !== id) })),

      hydrateCloud: (data) =>
        set({
          program: data.program ?? null,
          progress: data.program ? clampProgress(data.program, data.progress ?? initialProgress) : initialProgress,
          done: data.done ?? {},
          skipped: data.skipped ?? {},
          results: data.results ?? {},
          log: data.log ?? {},
          settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
          sessionStarted: !!data.sessionStarted,
          library: data.library ?? [],
        }),
      resetAll: () =>
        set({
          program: null,
          progress: initialProgress,
          done: {},
          skipped: {},
          results: {},
          log: {},
          settings: DEFAULT_SETTINGS,
          sessionStarted: false,
          library: [],
        }),

      setDone: (ids, value) =>
        set((state) => {
          const done = { ...state.done };
          const skipped = { ...state.skipped };
          for (const id of ids) {
            if (value) {
              done[id] = true;
              delete skipped[id];
            } else delete done[id];
          }
          return { done, skipped, log: refreshLog(state.program, done, skipped, state.log) };
        }),
      setSkipped: (ids, value) =>
        set((state) => {
          const done = { ...state.done };
          const skipped = { ...state.skipped };
          for (const id of ids) {
            if (value) {
              skipped[id] = true;
              delete done[id];
            } else delete skipped[id];
          }
          return { done, skipped, log: refreshLog(state.program, done, skipped, state.log) };
        }),
      setResult: (id, result) =>
        set((state) => {
          const results = { ...state.results };
          if (result) results[id] = result;
          else delete results[id];
          return { results };
        }),
      markSessionStarted: (sessionId) =>
        set((state) =>
          state.log[sessionId]?.startedAt
            ? {}
            : { log: { ...state.log, [sessionId]: { ...state.log[sessionId], startedAt: Date.now() } } },
        ),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
    }),
    {
      name: 'workouts-program-v1',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any, version) => {
        let state = persisted ?? {};
        if (version < 2) {
          const { program, done } = migrateV1(state);
          state = { ...state, program, done, sessionStarted: false };
        }
        if (version < 3) state = { ...state, library: state.library ?? [] };
        if (version < 4)
          state = {
            ...state,
            skipped: state.skipped ?? {},
            results: state.results ?? {},
            log: state.log ?? {},
            settings: { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) },
          };
        return state;
      },
    },
  ),
);
