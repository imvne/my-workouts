import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { beep, keepAwake, unlockAudio } from '@/lib/cues';
import { emomInterval, formatOf, minutesIn } from '@/lib/formats';
import { valueFor } from '@/store/programStore';
import type { ProgramExercise } from '@/types/program';

type Props = {
  exercise: ProgramExercise;
  setIndex: number;
  onSetChange: (set: number) => void;
  onFinish: () => void;
  finishLabel: string;
  onPrev: () => void;
  canPrev: boolean;
  onSkip: () => void;
  nextLabel: string;
  nextHint: string;
  /** Vrai quand seul l'essentiel est affiché (chrono lancé, pas de tap récent). */
  onImmersiveChange: (immersive: boolean) => void;
};

const fmt = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function TimedExercise({
  exercise,
  setIndex,
  onSetChange,
  onFinish,
  finishLabel,
  onPrev,
  canPrev,
  onSkip,
  nextLabel,
  nextHint,
  onImmersiveChange,
}: Props) {
  const format = formatOf(exercise);
  const interval = emomInterval(exercise.name) * 1000;
  const capMinutes = minutesIn(exercise.name, ...exercise.reps);
  const mode: 'emom' | 'countdown' | 'stopwatch' =
    format === 'emom' ? 'emom' : format === 'amrap' && capMinutes ? 'countdown' : 'stopwatch';
  const total =
    mode === 'emom' ? exercise.sets * interval : mode === 'countdown' ? (capMinutes ?? 0) * 60000 : Infinity;

  // Temps écoulé = cumul des segments précédents + segment en cours.
  const [base, setBase] = useState(() => (mode === 'emom' ? setIndex * interval : 0));
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = startAt !== null;
  const elapsed = base + (running ? now - startAt : 0);
  const finished = elapsed >= total;
  const round = mode === 'emom' ? Math.min(Math.floor(elapsed / interval), exercise.sets - 1) : setIndex;
  const display =
    mode === 'emom'
      ? (round + 1) * interval - elapsed
      : mode === 'countdown'
        ? total - elapsed
        : elapsed;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  // Nouveau tour d'EMOM : on avance la série et on bipe.
  useEffect(() => {
    if (running && mode === 'emom' && round !== setIndex && !finished) {
      onSetChange(round);
      beep(990, 220);
    }
  }, [round, running, mode, setIndex, finished, onSetChange]);

  // Décompte 3-2-1 avant chaque changement de tour / fin.
  const lastTick = useRef<number | null>(null);
  const secondsLeft = Math.ceil(display / 1000);
  useEffect(() => {
    if (!running || mode === 'stopwatch') return;
    if (secondsLeft <= 3 && secondsLeft >= 1 && lastTick.current !== secondsLeft) {
      lastTick.current = secondsLeft;
      beep(660, 90);
    }
  }, [secondsLeft, running, mode]);

  useEffect(() => {
    if (running && finished) {
      setBase(total);
      setStartAt(null);
      beep(990, 400);
      keepAwake(false);
    }
  }, [running, finished, total]);

  const immersive = running && !controls;
  useEffect(() => {
    onImmersiveChange(immersive);
  }, [immersive, onImmersiveChange]);
  useEffect(
    () => () => {
      onImmersiveChange(false);
      keepAwake(false);
    },
    [onImmersiveChange],
  );

  const reveal = () => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3500);
  };

  const start = () => {
    unlockAudio();
    keepAwake(true);
    setNow(Date.now());
    setStartAt(Date.now());
    beep(990, 220);
    reveal();
  };

  const pause = () => {
    setBase(elapsed);
    setStartAt(null);
    setControls(true);
    keepAwake(false);
  };

  const reps = valueFor(exercise.reps, round);
  const load = valueFor(exercise.loads, round);
  const label = interval === 60000 ? 'Minute' : 'Tour';

  return (
    <Pressable style={styles.root} onPress={running ? reveal : undefined}>
      <View style={styles.center}>
        <Text style={styles.name} adjustsFontSizeToFit numberOfLines={2}>
          {exercise.name}
        </Text>
        <View style={styles.badges}>
          {!!reps && <Text style={styles.badge}>{reps} reps</Text>}
          {!!load && <Text style={styles.badge}>{load}</Text>}
        </View>

        <Text style={[styles.clock, finished && styles.clockDone]}>{fmt(display)}</Text>
        {mode === 'emom' && (
          <Text style={styles.round}>
            {label} {round + 1} / {exercise.sets}
          </Text>
        )}
        {mode === 'countdown' && <Text style={styles.round}>AMRAP {capMinutes} min</Text>}
      </View>

      <View style={[styles.bottom, immersive && styles.hidden]} pointerEvents={immersive ? 'none' : 'auto'}>
        {!finished && (
          <View style={styles.nextBox}>
            <Text style={styles.nextLabel}>Ensuite</Text>
            <Text style={styles.nextName} numberOfLines={1}>
              {nextHint}
            </Text>
          </View>
        )}

        {finished ? (
          <Button title={finishLabel} onPress={onFinish} style={styles.mainBtn} />
        ) : running ? (
          <View style={styles.pair}>
            <Button title="Pause" variant="ghost" onPress={pause} style={styles.flex} />
            {mode !== 'emom' && (
              <Button
                title="Terminé"
                onPress={() => {
                  pause();
                  onFinish();
                }}
                style={styles.flex}
              />
            )}
          </View>
        ) : (
          <Button title={elapsed > 0 ? 'Reprendre' : 'Démarrer'} onPress={start} style={styles.mainBtn} />
        )}

        <View style={styles.subActions}>
          <Pressable onPress={onPrev} disabled={!canPrev} hitSlop={10} style={!canPrev && styles.hidden}>
            <Text style={styles.subText}>← Précédent</Text>
          </Pressable>
          <Pressable onPress={onSkip} hitSlop={10}>
            <Text style={styles.subText}>{nextLabel === 'Séance terminée' ? 'Terminer →' : 'Passer →'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    color: colors.text,
    textAlign: 'center',
  },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    overflow: 'hidden',
    backgroundColor: colors.pinkSoft,
    color: colors.pinkDeep,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  clock: {
    marginTop: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 104,
    lineHeight: 112,
    letterSpacing: -4,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  clockDone: { color: colors.pinkDeep },
  round: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottom: { gap: spacing.md },
  hidden: { opacity: 0 },
  nextBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nextName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  mainBtn: { paddingVertical: spacing.md + 4 },
  pair: { flexDirection: 'row', gap: spacing.sm },
  subActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  subText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
});
