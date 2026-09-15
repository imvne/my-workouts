import type { Block, WeekPrescription } from '@/types/workout';

const weeks = <T extends WeekPrescription>(items: T[]): WeekPrescription[] => items;

export const currentBlock: Block = {
  id: 'bloc-1',
  name: 'Bloc 1 — Force',
  weeks: 4,
  sessions: [
    {
      id: 'seance-1',
      name: 'Séance 1',
      order: 1,
      exercises: [
        {
          id: 's1-tractions-pyramide',
          name: 'Tractions pyramide',
          format: 'pyramid',
          trackRpe: true,
          trackRir: true,
          prescriptionByWeek: weeks([
            { pyramidFrom: 1, pyramidTo: 7 },
            { pyramidFrom: 1, pyramidTo: 7 },
            { pyramidFrom: 1, pyramidTo: 7 },
            { pyramidFrom: 1, pyramidTo: 7 },
          ]),
          notes: 'Pyramide 1 → 7',
        },
        {
          id: 's1-emom-bleu',
          name: 'EMOM tractions (élastique bleu)',
          format: 'emom',
          band: 'bleu',
          trackRpe: true,
          prescriptionByWeek: weeks([
            {
              durationMin: 10,
              targetReps: 2,
              load: { type: 'band', color: 'bleu' },
            },
            {
              durationMin: 10,
              targetReps: 3,
              load: { type: 'band', color: 'bleu' },
            },
            {
              durationMin: 10,
              targetReps: 4,
              load: { type: 'band', color: 'bleu' },
            },
            {
              durationMin: 10,
              targetReps: 5,
              load: { type: 'band', color: 'bleu' },
            },
          ]),
          notes: 'Évolution reps sur les 4 semaines du bloc',
        },
        {
          id: 's1-elevations-laterales',
          name: 'Élévations latérales',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's1-crunch-poulie',
          name: 'Crunch poulie haute',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
      ],
    },
    {
      id: 'seance-2',
      name: 'Séance 2',
      order: 2,
      exercises: [
        {
          id: 's2-dips-lourds',
          name: 'Dips',
          format: 'sets_reps',
          trackRpe: true,
          trackRir: true,
          track1rm: true,
          prescriptionByWeek: weeks([
            {
              sets: 2,
              reps: 3,
              load: { type: 'kg', value: 2.5 },
            },
            {
              sets: 2,
              reps: 3,
              load: { type: 'kg', value: 5 },
            },
            {
              sets: 2,
              reps: 3,
              load: { type: 'kg', value: 7.5 },
            },
            {
              sets: 2,
              reps: 3,
              load: { type: 'kg', value: 10 },
            },
          ]),
          notes: '2×3 — évolution poids sur les 4 semaines',
        },
        {
          id: 's2-dips-volume',
          name: 'Dips volume',
          format: 'sets_reps',
          trackRpe: true,
          prescriptionByWeek: weeks([
            {
              sets: 2,
              reps: 6,
              load: { type: 'band', color: 'bleu' },
            },
            {
              sets: 2,
              reps: 6,
              load: { type: 'bodyweight' },
            },
            {
              sets: 2,
              reps: 6,
              load: { type: 'kg', value: 2.5 },
            },
            {
              sets: 2,
              reps: 6,
              load: { type: 'kg', value: 5 },
            },
          ]),
          notes: '2×6 — bleu / 0 / 2,5 / 5',
        },
        {
          id: 's2-chest-press',
          name: 'Chest press',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's2-militaire',
          name: 'Développé militaire haltères',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's2-rota-int',
          name: 'Rotation interne épaules',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
      ],
    },
    {
      id: 'seance-3',
      name: 'Séance 3',
      order: 3,
      exercises: [
        {
          id: 's3-tractions-neg',
          name: 'Tractions négatives lestées',
          format: 'negatives',
          trackRpe: true,
          trackRir: true,
          prescriptionByWeek: weeks(
            [10, 12.5, 15, 20].map((value) => ({
              sets: 3,
              reps: null,
              load: { type: 'kg', value },
            })),
          ),
          notes: 'Charge négative évolutive 10 / 12,5 / 15 / 20',
        },
        {
          id: 's3-squat-single',
          name: 'Squat — single',
          format: 'sets_reps',
          trackRpe: true,
          trackRir: true,
          track1rm: true,
          prescriptionByWeek: weeks(
            [70, 75, 80, 85].map((value) => ({
              sets: 1,
              reps: 1,
              load: { type: 'kg', value },
            })),
          ),
          notes: '1×1',
        },
        {
          id: 's3-squat-triples',
          name: 'Squat — triples',
          format: 'sets_reps',
          trackRpe: true,
          trackRir: true,
          track1rm: true,
          prescriptionByWeek: weeks(
            [55, 60, 65, 70].map((value) => ({
              sets: 3,
              reps: 3,
              load: { type: 'kg', value },
            })),
          ),
          notes: '3×3',
        },
        {
          id: 's3-fentes',
          name: 'Fentes bulgares',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's3-presse',
          name: 'Presse',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's3-hipthrust',
          name: 'Hip thrust',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
        {
          id: 's3-oiseau',
          name: 'Oiseau deltoïde postérieur',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
            { sets: 3, reps: null, load: { type: 'free' } },
          ]),
        },
      ],
    },
    {
      id: 'seance-4',
      name: 'Séance 4',
      order: 4,
      exercises: [
        {
          id: 's4-mu-excentrique',
          name: 'Muscle-up anneaux excentrique',
          format: 'negatives',
          trackRpe: true,
          trackRir: true,
          track1rm: true,
          prescriptionByWeek: weeks([
            {
              sets: 3,
              reps: 1,
              load: { type: 'band_plus_body', color: 'vert' },
              notes: 'v+b (vert + bande)',
            },
            {
              sets: 3,
              reps: 1,
              load: { type: 'band_plus_body', color: 'vert' },
              notes: 'v+b',
            },
            {
              sets: 3,
              reps: 1,
              load: { type: 'band_plus_body', color: 'vert' },
              notes: 'v+b',
            },
            {
              sets: 3,
              reps: 1,
              load: { type: 'band_plus_body', color: 'vert' },
              notes: 'v+b',
            },
          ]),
          notes: '3×1 — assistance v+b',
        },
        {
          id: 's4-mu-negatives',
          name: 'MU négatives lestées',
          format: 'negatives',
          trackRpe: true,
          prescriptionByWeek: weeks(
            [5, 7.5, 10, 12.5].map((value) => ({
              sets: 3,
              reps: 1,
              load: { type: 'kg', value },
            })),
          ),
          notes: '3×1 — 5 / 7,5 / 10 / 12,5',
        },
        {
          id: 's4-complexe',
          name: 'Complexe pull / dips / squat / pompes',
          format: 'complex',
          prescriptionByWeek: weeks([
            {
              rounds: 4,
              movements: [
                { name: 'Pull-up', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Dips', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Squat', reps: 10, load: { type: 'kg', value: 30 } },
                { name: 'Pompes', reps: 10, load: { type: 'bodyweight' } },
              ],
            },
            {
              rounds: 4,
              movements: [
                { name: 'Pull-up', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Dips', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Squat', reps: 10, load: { type: 'kg', value: 30 } },
                { name: 'Pompes', reps: 10, load: { type: 'bodyweight' } },
              ],
            },
            {
              rounds: 4,
              movements: [
                { name: 'Pull-up', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Dips', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Squat', reps: 10, load: { type: 'kg', value: 30 } },
                { name: 'Pompes', reps: 10, load: { type: 'bodyweight' } },
              ],
            },
            {
              rounds: 4,
              movements: [
                { name: 'Pull-up', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Dips', reps: 10, load: { type: 'band', color: 'bleu' } },
                { name: 'Squat', reps: 10, load: { type: 'kg', value: 30 } },
                { name: 'Pompes', reps: 10, load: { type: 'bodyweight' } },
              ],
            },
          ]),
          notes: 'Set [10 / 10 / 10 / 10] × 4',
        },
        {
          id: 's4-leg-raises',
          name: 'Leg raises',
          format: 'sets_reps',
          prescriptionByWeek: weeks([
            { sets: 3, reps: null, load: { type: 'bodyweight' } },
            { sets: 3, reps: null, load: { type: 'bodyweight' } },
            { sets: 3, reps: null, load: { type: 'bodyweight' } },
            { sets: 3, reps: null, load: { type: 'bodyweight' } },
          ]),
        },
      ],
    },
  ],
};

export function getSession(sessionId: string) {
  return currentBlock.sessions.find((s) => s.id === sessionId);
}

export function getExercise(sessionId: string, exerciseId: string) {
  return getSession(sessionId)?.exercises.find((e) => e.id === exerciseId);
}

export function getWeekPrescription(
  exercise: { prescriptionByWeek: WeekPrescription[] },
  week: number,
): WeekPrescription {
  const index = Math.max(0, Math.min(week - 1, exercise.prescriptionByWeek.length - 1));
  return exercise.prescriptionByWeek[index];
}