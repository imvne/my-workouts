import { DEFAULT_SETS } from '@/store/programStore';
import { createId } from '@/lib/format';
import type { Program, ProgramProgress, ProgramSession } from '@/types/program';

const SEP = ';';

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
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Parse une ligne CSV (séparateur ;) en gérant les guillemets. */
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
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function programToCsv(program: Program, progress: ProgramProgress): string {
  const meta = `# weeks=${program.weeks} week=${progress.week} session=${progress.session} exercise=${progress.exercise} set=${progress.set}`;
  const header = ['séance', 'titre', 'exo', 'séries', ...Array.from({ length: program.weeks }, (_, i) => `S${i + 1}`)];
  const rows = [meta, header.join(SEP)];
  program.sessions.forEach((s, si) => {
    s.exercises.forEach((e) => {
      rows.push(
        [String(si + 1), quote(s.title), quote(e.name), String(e.sets), ...e.weeks.map(quote)].join(SEP),
      );
    });
  });
  return rows.join('\n');
}

export function csvToProgram(text: string): { program: Program; progress: ProgramProgress } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error('Texte vide.');

  const meta: Record<string, number> = {};
  if (lines[0].startsWith('#')) {
    for (const m of lines.shift()!.matchAll(/(\w+)=(\d+)/g)) meta[m[1]] = Number(m[2]);
  }
  if (lines.length === 0) throw new Error('Aucune ligne d’exo.');

  const sep = detectSep(lines[0]);
  const header = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  const hasHeader = header[0] === 'séance' || header[0] === 'seance';
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const weekCols = hasHeader ? header.filter((h) => /^s\d+$/.test(h)).length : 0;
  let weeks = meta.weeks || weekCols || 1;

  const sessions = new Map<number, ProgramSession>();
  for (const line of dataLines) {
    const cols = splitLine(line, sep);
    const index = parseInt(cols[0], 10);
    const name = (cols[2] ?? '').trim();
    if (Number.isNaN(index) || !name) continue;
    const sets = Math.max(1, parseInt(cols[3], 10) || DEFAULT_SETS);
    const weekTexts = cols.slice(4).map((w) => w.trim());
    weeks = Math.max(weeks, weekTexts.length);
    if (!sessions.has(index)) {
      sessions.set(index, {
        id: createId('s'),
        title: (cols[1] ?? '').trim() || `Séance ${index}`,
        exercises: [],
      });
    }
    sessions.get(index)!.exercises.push({ id: createId('ex'), name, sets, weeks: weekTexts });
  }
  if (sessions.size === 0)
    throw new Error(
      `Aucun exo reconnu (${dataLines.length} ligne(s) lue(s)). Format attendu : séance;titre;exo;séries;S1;S2…`,
    );

  const program: Program = {
    weeks,
    sessions: [...sessions.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, s]) => ({
        ...s,
        exercises: s.exercises.map((e) => ({
          ...e,
          weeks: Array.from({ length: weeks }, (_, i) => e.weeks[i] ?? ''),
        })),
      })),
  };
  const progress: ProgramProgress = {
    week: meta.week || 1,
    session: meta.session || 0,
    exercise: meta.exercise || 0,
    set: meta.set || 0,
  };
  return { program, progress };
}
