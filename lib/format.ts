import { BAND_KG } from '@/constants/theme';
import type { BandColor, LoadSpec, WeekPrescription } from '@/types/workout';

export function formatBand(color: BandColor): string {
  return `Élastique ${color} (${BAND_KG[color]} kg)`;
}

export function formatLoad(load?: LoadSpec | null): string {
  if (!load) return 'Charge libre';
  switch (load.type) {
    case 'kg':
      return `${load.value} kg`;
    case 'band':
      return formatBand(load.color);
    case 'bodyweight':
      return 'Poids du corps';
    case 'band_plus_body':
      return load.color ? `v+b — ${formatBand(load.color)}` : 'v+b';
    case 'free':
      return 'Charge libre';
    default:
      return '';
  }
}

export function formatPrescriptionSummary(p: WeekPrescription): string {
  const parts: string[] = [];

  if (p.pyramidFrom != null && p.pyramidTo != null) {
    parts.push(`Pyramide ${p.pyramidFrom} → ${p.pyramidTo}`);
  }

  if (p.durationMin != null) {
    parts.push(`EMOM ${p.durationMin} min`);
    if (p.targetReps != null) parts.push(`${p.targetReps} reps / min`);
  }

  if (p.rounds != null && p.movements?.length) {
    parts.push(`${p.rounds} rounds`);
    parts.push(
      p.movements
        .map((m) => `${m.reps} ${m.name}${m.load ? ` (${formatLoad(m.load)})` : ''}`)
        .join(' / '),
    );
  }

  if (p.sets != null) {
    const repsLabel = p.reps == null ? '?' : String(p.reps);
    parts.push(`${p.sets}×${repsLabel}`);
  }

  if (p.load) {
    parts.push(formatLoad(p.load));
  }

  if (p.notes) parts.push(p.notes);

  return parts.filter(Boolean).join(' · ') || 'À saisir';
}

export function expectedSetCount(p: WeekPrescription): number {
  if (p.pyramidFrom != null && p.pyramidTo != null) {
    return p.pyramidTo - p.pyramidFrom + 1;
  }
  if (p.durationMin != null) return p.durationMin;
  if (p.rounds != null) return p.rounds;
  return p.sets ?? 3;
}

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
