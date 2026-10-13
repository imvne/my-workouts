import type { ExerciseFormat, LibraryItem, Program } from '@/types/program';

export const FORMATS: { key: ExerciseFormat; label: string }[] = [
  { key: 'sets', label: 'Séries' },
  { key: 'emom', label: 'EMOM' },
  { key: 'amrap', label: 'AMRAP' },
  { key: 'fortime', label: 'For Time' },
  { key: 'circuit', label: 'Circuit' },
];

export const formatLabel = (f: ExerciseFormat) => FORMATS.find((x) => x.key === f)?.label ?? 'Séries';

/** Format lisible dans le nom : « emom », « e2mom », « amrap », « for time », « circuit ». */
export function inferFormat(name: string): ExerciseFormat | null {
  const n = name.toLowerCase();
  if (/\be\d*mom\b/.test(n)) return 'emom';
  if (/amrap/.test(n)) return 'amrap';
  if (/for ?time/.test(n)) return 'fortime';
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

export const BUILTIN_LIBRARY: LibraryItem[] = [
  { id: 'builtin-emom', name: 'EMOM', format: 'emom' },
  { id: 'builtin-e2mom', name: 'E2MOM', format: 'emom' },
  { id: 'builtin-amrap', name: 'AMRAP', format: 'amrap' },
  { id: 'builtin-fortime', name: 'For Time', format: 'fortime' },
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
