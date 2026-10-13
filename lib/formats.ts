import type { ExerciseFormat, LibraryItem, Program } from '@/types/program';

export const FORMATS: { key: ExerciseFormat; label: string }[] = [
  { key: 'sets', label: 'Séries' },
  { key: 'emom', label: 'EMOM' },
  { key: 'amrap', label: 'AMRAP' },
  { key: 'fortime', label: 'For Time' },
  { key: 'tabata', label: 'Tabata' },
  { key: 'circuit', label: 'Circuit' },
];

export const formatLabel = (f: ExerciseFormat) => FORMATS.find((x) => x.key === f)?.label ?? 'Séries';

/** Format lisible dans le nom : « emom », « e2mom », « amrap », « for time », « circuit ». */
export function inferFormat(name: string): ExerciseFormat | null {
  const n = name.toLowerCase();
  if (/\be\d*mom\b/.test(n)) return 'emom';
  if (/amrap/.test(n)) return 'amrap';
  if (/for ?time/.test(n)) return 'fortime';
  if (/tabata/.test(n)) return 'tabata';
  if (/circuit/.test(n)) return 'circuit';
  return null;
}

export function formatOf(e: { name: string; format?: ExerciseFormat }): ExerciseFormat {
  return e.format ?? inferFormat(e.name) ?? 'sets';
}

/** Durée d'un tour d'EMOM en secondes : EMOM = 60, E2MOM = 120, E3MOM = 180… */
export function emomInterval(name: string): number {
  const m = name.toLowerCase().match(/\be(\d+)mom\b/);
  return (m ? Math.max(1, parseInt(m[1], 10)) : 1) * 60;
}

/** Durée en minutes écrite dans le nom ou les reps : « amrap 12 », « 10 min », « 8' ». */
export function minutesIn(...texts: string[]): number | null {
  for (const t of texts) {
    const m = t.toLowerCase().match(/(\d+)\s*(?:min|'|’)|amrap\s*(\d+)/);
    if (m) return parseInt(m[1] ?? m[2], 10);
  }
  return null;
}

/** Tabata : 20 s effort / 10 s repos par défaut, ou « tabata 40/20 ». */
export function tabataTiming(name: string): { work: number; rest: number } {
  const m = name.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { work: parseInt(m[1], 10), rest: parseInt(m[2], 10) } : { work: 20, rest: 10 };
}

/** Repos en secondes : « 90 », « 90s », « 1:30 », « 2' », « 2 min ». */
export function parseRest(text: string | undefined): number {
  const t = (text ?? '').trim().toLowerCase();
  if (!t) return 0;
  const mmss = t.match(/^(\d+):(\d{1,2})$/);
  if (mmss) return parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
  const min = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:min|m|'|’)$/);
  if (min) return Math.round(parseFloat(min[1].replace(',', '.')) * 60);
  const sec = t.match(/^(\d+)\s*s?$/);
  return sec ? parseInt(sec[1], 10) : 0;
}

export const BUILTIN_LIBRARY: LibraryItem[] = [
  { id: 'builtin-emom', name: 'EMOM', format: 'emom' },
  { id: 'builtin-e2mom', name: 'E2MOM', format: 'emom' },
  { id: 'builtin-amrap', name: 'AMRAP', format: 'amrap' },
  { id: 'builtin-fortime', name: 'For Time', format: 'fortime' },
  { id: 'builtin-tabata', name: 'Tabata', format: 'tabata' },
  { id: 'builtin-circuit', name: 'Circuit', format: 'circuit' },
];

/** Suggestions pour un nom en cours de saisie : bibliothèque + exos déjà présents dans la prog. */
export function suggest(query: string, library: LibraryItem[], program: Program | null): LibraryItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const seen = new Set<string>();
  const out: LibraryItem[] = [];
  const add = (item: LibraryItem) => {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key) || key === q || !key.includes(q)) return;
    seen.add(key);
    out.push(item);
  };
  library.forEach(add);
  for (const w of program?.weeks ?? [])
    for (const s of w.sessions)
      for (const e of s.exercises) add({ id: `prog-${e.id}`, name: e.name.trim(), format: formatOf(e) });
  BUILTIN_LIBRARY.forEach(add);
  return out.slice(0, 6);
}
