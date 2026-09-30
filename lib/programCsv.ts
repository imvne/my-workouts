import { createId } from '@/lib/format';
import { DEFAULT_SETS } from '@/store/programStore';
import type { Program, ProgramProgress, ProgramSession, ProgramWeek } from '@/types/program';

const SEP = ';';
const HEADER = ['semaine', 'séance', 'exo', 'séries', 'reps', 'charges'];

/** Séparateur du fichier : `;` (Excel/Numbers FR), `,` ou tabulation. */
function detectSep(line: string): string {
  const counts: [string, number][] = [
    [';', (line.match(/;/g) ?? []).length],
    [',', (line.match(/,/g) ?? []).length],
    ['\t', (line.match(/\t/g) ?? []).length],
  ];
  counts.sort((x, y) => y[1] - x[1]);
  return counts[0][1] > 0 ? counts[0][0] : SEP;
}

function quote(value: string): string {
  return /[;,"\n\r\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function splitLine(line: string, sep = SEP): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export function programToCsv(
  program: Program,
  progress: ProgramProgress,
  done: Record<string, true> = {},
): string {
  const doneIdx: string[] = [];
  program.weeks.forEach((w, wi) =>
    w.sessions.forEach((s, si) =>
      s.exercises.forEach((e, ei) => {
        if (done[e.id]) doneIdx.push(`${wi + 1}.${si}.${ei}`);
      }),
    ),
  );
  const meta = `# v2 week=${progress.week} session=${progress.session} exercise=${progress.exercise} set=${progress.set} done=${doneIdx.join(',')}`;
  const rows = [meta, HEADER.join(SEP)];
  program.weeks.forEach((w, wi) =>
    w.sessions.forEach((s) =>
      s.exercises.forEach((e) => {
        rows.push(
          [
            String(wi + 1),
            quote(s.title),
            quote(e.name),
            String(e.sets),
            quote(e.reps.join('|')),
            quote(e.loads.join('|')),
          ].join(SEP),
        );
      }),
    ),
  );
  return rows.join('\n');
}

type Parsed = { program: Program; progress: ProgramProgress; done: string[] };

export function csvToProgram(text: string): Parsed {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error('Texte vide.');

  const meta: Record<string, number> = {};
  let doneIdx: string[] = [];
  if (lines[0].startsWith('#')) {
    const metaLine = lines.shift()!;
    for (const m of metaLine.matchAll(/(\w+)=(\d+)/g)) meta[m[1]] = Number(m[2]);
    const d = metaLine.match(/done=([\d.,]*)/);
    if (d) doneIdx = d[1].split(',').filter(Boolean);
  }
  if (lines.length === 0) throw new Error('Aucune ligne d’exo.');

  const sep = detectSep(lines[0]);
  const header = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  const isV2 = header[0] === 'semaine';
  const hasHeader = isV2 || header[0] === 'séance' || header[0] === 'seance';
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const weeks = isV2
    ? parseV2(dataLines, sep)
    : parseLegacy(dataLines, sep, header, meta.weeks ?? 0);

  if (weeks.length === 0)
    throw new Error(
      `Aucun exo reconnu (${dataLines.length} ligne(s) lue(s)). Format : semaine;séance;exo;séries;reps;charges`,
    );

  const program: Program = { weeks };
  const progress: ProgramProgress = {
    week: meta.week || 1,
    session: meta.session || 0,
    exercise: meta.exercise || 0,
    set: meta.set || 0,
  };
  const done: string[] = [];
  for (const idx of doneIdx) {
    const [w, si, ei] = idx.split('.').map(Number);
    const e = program.weeks[w - 1]?.sessions[si]?.exercises[ei];
    if (e) done.push(e.id);
  }
  return { program, progress, done };
}

const series = (value: string) => (value ? value.split('|').map((v) => v.trim()) : []);

function parseV2(lines: string[], sep: string): ProgramWeek[] {
  const weeks = new Map<number, Map<string, ProgramSession>>();
  for (const line of lines) {
    const cols = splitLine(line, sep).map((c) => c.trim());
    const week = parseInt(cols[0], 10);
    const name = cols[2] ?? '';
    if (Number.isNaN(week) || !name) continue;
    const title = cols[1] || 'Séance';
    if (!weeks.has(week)) weeks.set(week, new Map());
    const sessions = weeks.get(week)!;
    if (!sessions.has(title))
      sessions.set(title, { id: createId('s'), title, exercises: [] });
    sessions.get(title)!.exercises.push({
      id: createId('ex'),
      name,
      sets: Math.max(1, parseInt(cols[3], 10) || DEFAULT_SETS),
      reps: series(cols[4] ?? ''),
      loads: series(cols[5] ?? ''),
    });
  }
  return [...weeks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, sessions]) => ({ id: createId('w'), sessions: [...sessions.values()] }));
}

/** Ancien format (séance;titre;exo;séries;S…;C…;R…) : les séances valaient pour tout le bloc. */
function parseLegacy(
  lines: string[],
  sep: string,
  header: string[],
  metaWeeks: number,
): ProgramWeek[] {
  const noteCols = header.filter((h) => /^s\d+$/.test(h)).length;
  const loadCols = header.filter((h) => /^c\d+$/.test(h)).length;
  const repCols = header.filter((h) => /^r\d+$/.test(h)).length;
  const weekCount = Math.max(metaWeeks, noteCols, loadCols, repCols, 1);

  type Row = { index: number; title: string; name: string; sets: number; reps: string[][]; loads: string[][] };
  const rows: Row[] = [];
  for (const line of lines) {
    const cols = splitLine(line, sep).map((c) => c.trim());
    const index = parseInt(cols[0], 10);
    const name = cols[2] ?? '';
    if (Number.isNaN(index) || !name) continue;
    const rest = cols.slice(4);
    rows.push({
      index,
      title: cols[1] || `Séance ${index}`,
      name,
      sets: Math.max(1, parseInt(cols[3], 10) || DEFAULT_SETS),
      loads: (loadCols ? rest.slice(noteCols, noteCols + loadCols) : []).map(series),
      reps: (repCols ? rest.slice(noteCols + loadCols, noteCols + loadCols + repCols) : []).map(
        series,
      ),
    });
  }
  if (rows.length === 0) return [];

  const pick = (list: string[][], week: number): string[] => {
    for (let i = Math.min(week, list.length) - 1; i >= 0; i--) {
      if ((list[i] ?? []).some(Boolean)) return list[i];
    }
    return [];
  };

  return Array.from({ length: weekCount }, (_, wi) => {
    const sessions = new Map<number, ProgramSession>();
    for (const r of rows) {
      if (!sessions.has(r.index))
        sessions.set(r.index, { id: createId('s'), title: r.title, exercises: [] });
      sessions.get(r.index)!.exercises.push({
        id: createId('ex'),
        name: r.name,
        sets: r.sets,
        reps: pick(r.reps, wi + 1),
        loads: pick(r.loads, wi + 1),
      });
    }
    return {
      id: createId('w'),
      sessions: [...sessions.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s),
    };
  });
}
