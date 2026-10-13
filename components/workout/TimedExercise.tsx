import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Stats } from '@/components/workout/Stats';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { beep, keepAwake, unlockAudio } from '@/lib/cues';
import { emomInterval, formatOf, minutesIn, tabataTiming } from '@/lib/formats';
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
  nextHint: string;
  /** Vrai quand seul l'essentiel est affiché (chrono lancé, pas de tap récent). */
  onImmersiveChange: (immersive: boolean) => void;
  /** Couleur de fond de l'écran selon la phase (repos, préparation). */
  onTint: (color: string | null) => void;
};

type Mode = 'emom' | 'tabata' | 'countdown' | 'stopwatch';
const PREP_MS = 10_000;

export const fmtClock = (ms: number, up = false) => {
  const total = Math.max(0, up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Chrono façon SmartWOD : préparation 10 s, gros chiffres, tours, phases effort / repos. */
export function TimedExercise({
  exercise,
  setIndex,
  onSetChange,
  onFinish,
  finishLabel,
  onPrev,
  canPrev,
  onSkip,
  nextHint,
  onImmersiveChange,
  onTint,
}: Props) {
  const format = formatOf(exercise);
  const minutes = minutesIn(exercise.name, ...exercise.reps);
  const sets = exercise.sets;

  let mode: Mode;
  let interval = 0; // durée d'un tour
  let workMs = 0; // part « effort » d'un tour (Tabata)
  let total = Infinity;
  if (format === 'emom') {
    mode = 'emom';
    interval = emomInterval(exercise.name) * 1000;
    total = sets * interval;
  } else if (format === 'tabata') {
    mode = 'tabata';
    const t = tabataTiming(exercise.name);
    workMs = t.work * 1000;
    interval = (t.work + t.rest) * 1000;
    total = sets * interval - t.rest * 1000; // pas de repos après le dernier tour
  } else if (format === 'amrap' && minutes) {
    mode = 'countdown';
    total = minutes * 60000;
  } else {
    mode = 'stopwatch';
    if (format === 'fortime' && minutes) total = minutes * 60000; // time cap
  }
  const rounds = mode === 'emom' || mode === 'tabata';

  // Temps d'effort écoulé = cumul des segments précédents + segment en cours (hors préparation).
  const [base, setBase] = useState(() => (rounds ? setIndex * interval : 0));
  const [startAt, setStartAt] = useState<number | null>(null);
  const [prepEnd, setPrepEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = startAt !== null;
  const inPrep = running && prepEnd !== null && now < prepEnd;
  const elapsed = base + (running ? Math.max(0, now - startAt) : 0);
  const finished = elapsed >= total;

  const round = rounds ? Math.min(Math.floor(elapsed / interval), sets - 1) : setIndex;
  const within = elapsed - round * interval;
  const phase: 'work' | 'rest' = mode === 'tabata' && within >= workMs ? 'rest' : 'work';

  let display: number;
  if (inPrep) display = (prepEnd ?? 0) - now;
  else if (mode === 'emom') display = (round + 1) * interval - elapsed;
  else if (mode === 'tabata') display = phase === 'work' ? workMs - within : interval - within;
  else if (mode === 'countdown') display = total - elapsed;
  else display = elapsed;
  const countingUp = !inPrep && mode === 'stopwatch';

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  // Changement de tour : la série suit, bip long.
  useEffect(() => {
    if (running && !inPrep && rounds && round !== setIndex && !finished) {
      onSetChange(round);
      beep(990, 300);
    }
  }, [round, running, inPrep, rounds, setIndex, finished, onSetChange]);

  // Tabata : bip à chaque bascule effort ↔ repos.
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (running && !inPrep && phase !== lastPhase.current) beep(phase === 'work' ? 990 : 520, 300);
    lastPhase.current = phase;
  }, [phase, running, inPrep]);

  // Fin de préparation : top départ.
  const wasPrep = useRef(false);
  useEffect(() => {
    if (wasPrep.current && !inPrep && running) beep(990, 450);
    wasPrep.current = inPrep;
  }, [inPrep, running]);

  // Décompte 3-2-1 (préparation, fin de tour, fin de phase, fin d'AMRAP).
  const lastTick = useRef<number | null>(null);
  const secondsLeft = Math.ceil(display / 1000);
  useEffect(() => {
    if (!running || countingUp) return;
    if (secondsLeft <= 3 && secondsLeft >= 1 && lastTick.current !== secondsLeft) {
      lastTick.current = secondsLeft;
      beep(660, 100);
    }
    if (secondsLeft > 3) lastTick.current = null;
  }, [secondsLeft, running, countingUp]);

  useEffect(() => {
    if (running && finished) {
      setBase(total);
      setStartAt(null);
      setPrepEnd(null);
      beep(990, 700);
      keepAwake(false);
    }
  }, [running, finished, total]);

  const immersive = running && !controls;
  useEffect(() => onImmersiveChange(immersive), [immersive, onImmersiveChange]);

  const tint = inPrep ? colors.backgroundAlt : running && phase === 'rest' ? colors.pinkSoft : null;
  useEffect(() => onTint(tint), [tint, onTint]);

  useEffect(
    () => () => {
      onImmersiveChange(false);
      onTint(null);
      keepAwake(false);
    },
    [onImmersiveChange, onTint],
  );

  const reveal = () => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3500);
  };

  const start = () => {
    unlockAudio();
    keepAwake(true);
    const t = Date.now();
    // Préparation seulement au tout premier départ, pas à la reprise après pause.
    const prep = elapsed === 0 ? PREP_MS : 0;
    setNow(t);
    setPrepEnd(prep ? t + prep : null);
    setStartAt(t + prep);
    reveal();
  };

  const pause = () => {
    setBase(elapsed);
    setStartAt(null);
    setPrepEnd(null);
    setControls(true);
    keepAwake(false);
  };

  const reps = valueFor(exercise.reps, round);
  const load = valueFor(exercise.loads, round);

  let caption = '';
  if (inPrep) caption = 'Prêt ?';
  else if (mode === 'emom') caption = `${interval === 60000 ? 'Minute' : 'Tour'} ${round + 1} / ${sets}`;
  else if (mode === 'tabata') caption = `Round ${round + 1} / ${sets} · ${phase === 'work' ? 'Effort' : 'Repos'}`;
  else if (mode === 'countdown') caption = `AMRAP ${minutes} min`;
  else caption = format === 'fortime' ? (minutes ? `For Time · cap ${minutes} min` : 'For Time') : 'Chrono';

  const clockColor = inPrep ? colors.textMuted : phase === 'rest' || finished ? colors.pinkDeep : colors.text;

  return (
    <Pressable style={styles.root} onPress={running ? reveal : undefined}>
      <View style={styles.center}>
        <Text style={styles.name} adjustsFontSizeToFit numberOfLines={2}>
          {exercise.name}
        </Text>
        <View style={styles.statsGap}>
          <Stats reps={reps} load={load} big={false} />
        </View>

        <Text style={[styles.clock, { color: clockColor }]}>{fmtClock(display, countingUp)}</Text>
        <Text style={[styles.caption, phase === 'rest' && !inPrep && styles.captionRest]}>{caption}</Text>

        {rounds && (
          <View style={styles.roundDots}>
            {Array.from({ length: sets }, (_, i) => (
              <View key={i} style={[styles.roundDot, i < round && styles.roundDotDone, i === round && styles.roundDotNow]} />
            ))}
          </View>
        )}
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
            {!rounds && (
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
            <Text style={styles.subText}>Passer →</Text>
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
  statsGap: { alignSelf: 'stretch', marginTop: spacing.lg },
  badge: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.pinkSoft,
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
    fontSize: 112,
    lineHeight: 120,
    letterSpacing: -4,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  captionRest: { color: colors.pinkDeep },
  roundDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    maxWidth: 280,
  },
  roundDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  roundDotDone: { backgroundColor: colors.pink },
  roundDotNow: { backgroundColor: colors.pinkDeep, width: 20 },
  bottom: { gap: spacing.md },
  hidden: { opacity: 0 },
  nextBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
