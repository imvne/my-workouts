import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Stats } from '@/components/workout/Stats';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { beep, keepAwake, unlockAudio } from '@/lib/cues';
import { emomInterval, formatOf, minutesIn, tabataTiming } from '@/lib/formats';
import { useProgramStore, valueFor, type TimerResult } from '@/store/programStore';
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

export const fmtClock = (ms: number, up = false) => {
  const total = Math.max(0, up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Chrono façon SmartWOD : préparation, gros chiffres, tours, phases effort / repos, résultat gardé. */
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
  const prepMs = useProgramStore((s) => s.settings.prepSeconds) * 1000;
  const saved = useProgramStore((s) => s.results[exercise.id]);
  const setResult = useProgramStore((s) => s.setResult);

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
  const counter = !rounds; // For Time / AMRAP : on compte ses reps
  const target = /^\d+$/.test((exercise.reps[0] ?? '').trim()) ? parseInt(exercise.reps[0], 10) : null;

  // Temps d'effort écoulé = cumul des segments précédents + segment en cours (hors préparation).
  const [base, setBase] = useState(() => saved?.ms ?? (rounds ? setIndex * interval : 0));
  const [startAt, setStartAt] = useState<number | null>(null);
  const [prepEnd, setPrepEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [count, setCount] = useState(() => saved?.reps ?? 0);
  const [stopped, setStopped] = useState(() => !!saved?.finished); // « Terminé » (For Time)
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = startAt !== null;
  const inPrep = running && prepEnd !== null && now < prepEnd;
  const elapsed = base + (running ? Math.max(0, now - startAt) : 0);
  const finished = stopped || elapsed >= total;

  const round = rounds ? Math.min(Math.floor(elapsed / interval), sets - 1) : setIndex;
  const within = elapsed - round * interval;
  const phase: 'work' | 'rest' = mode === 'tabata' && within >= workMs ? 'rest' : 'work';

  let display: number;
  if (inPrep) display = (prepEnd ?? 0) - now;
  else if (finished && !rounds) display = Math.min(elapsed, total);
  else if (mode === 'emom') display = finished ? 0 : (round + 1) * interval - elapsed;
  else if (mode === 'tabata') display = finished ? 0 : phase === 'work' ? workMs - within : interval - within;
  else if (mode === 'countdown') display = total - elapsed;
  else display = elapsed;
  const countingUp = !inPrep && (mode === 'stopwatch' || (finished && !rounds));

  // Dernier état connu, pour l'enregistrer si on quitte l'écran en plein milieu.
  const latest = useRef({ elapsed, count, finished });
  latest.current = { elapsed, count, finished };

  const save = (ms: number, reps: number, isFinished: boolean) =>
    setResult(exercise.id, { ms, reps, finished: isFinished, at: Date.now() } satisfies TimerResult);

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

  // Fin naturelle (EMOM, Tabata, AMRAP, time cap).
  useEffect(() => {
    if (running && elapsed >= total) {
      setBase(total);
      setStartAt(null);
      setPrepEnd(null);
      save(total, latest.current.count, true);
      beep(990, 700);
      keepAwake(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, elapsed, total]);

  const immersive = running && !controls;
  useEffect(() => onImmersiveChange(immersive), [immersive, onImmersiveChange]);

  const tint = inPrep ? colors.backgroundAlt : running && phase === 'rest' ? colors.pinkSoft : null;
  useEffect(() => onTint(tint), [tint, onTint]);

  useEffect(
    () => () => {
      // On quitte l'écran (Précédent, Passer…) : on garde où on en était.
      const l = latest.current;
      if (l.elapsed > 0 && !l.finished) save(l.elapsed, l.count, false);
      onImmersiveChange(false);
      onTint(null);
      keepAwake(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reveal = () => {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 5000);
  };

  const start = () => {
    unlockAudio();
    keepAwake(true);
    const t = Date.now();
    // Préparation seulement au tout premier départ, pas à la reprise après pause.
    const prep = elapsed === 0 ? prepMs : 0;
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
    save(elapsed, count, false);
  };

  /** « Terminé » (For Time / chrono libre) : on fige le temps et on l'enregistre. */
  const stop = () => {
    setBase(elapsed);
    setStartAt(null);
    setPrepEnd(null);
    setStopped(true);
    setControls(true);
    keepAwake(false);
    save(elapsed, count, true);
    beep(990, 500);
  };

  const restart = () => {
    setResult(exercise.id, null);
    setBase(0);
    setStartAt(null);
    setPrepEnd(null);
    setStopped(false);
    setCount(0);
    setControls(true);
    if (rounds) onSetChange(0);
  };

  const bump = (delta: number) => {
    setCount((c) => {
      const n = Math.max(0, c + delta);
      if (target && n === target && delta > 0) beep(990, 250);
      return n;
    });
  };

  const reps = valueFor(exercise.reps, round);
  const load = valueFor(exercise.loads, round);

  let caption = '';
  if (inPrep) caption = 'Prêt ?';
  else if (finished) caption = format === 'fortime' ? 'Ton temps' : 'Terminé';
  else if (mode === 'emom') caption = `${interval === 60000 ? 'Minute' : 'Tour'} ${round + 1} / ${sets}`;
  else if (mode === 'tabata') caption = `Round ${round + 1} / ${sets} · ${phase === 'work' ? 'Effort' : 'Repos'}`;
  else if (mode === 'countdown') caption = `AMRAP ${minutes} min`;
  else if (format === 'fortime') caption = minutes ? `For Time · cap ${minutes} min` : 'For Time';
  else caption = format === 'amrap' ? 'AMRAP' : 'Chrono';

  const clockColor = inPrep
    ? colors.textMuted
    : finished
      ? colors.pinkDeep
      : phase === 'rest'
        ? colors.pinkDeep
        : colors.text;
  const pct = target ? Math.min(1, count / target) : 0;

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
        <Text style={[styles.caption, (phase === 'rest' || finished) && !inPrep && styles.captionAccent]}>
          {caption}
        </Text>

        {rounds && (
          <View style={styles.roundDots}>
            {Array.from({ length: sets }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.roundDot,
                  (i < round || finished) && styles.roundDotDone,
                  i === round && !finished && styles.roundDotNow,
                ]}
              />
            ))}
          </View>
        )}

        {counter && (
          <View style={styles.counter}>
            <View style={styles.counterRow}>
              <Pressable
                onPress={() => bump(-1)}
                hitSlop={8}
                disabled={count === 0}
                accessibilityLabel="Une rep de moins"
                style={[styles.minus, count === 0 && styles.off]}
              >
                <Text style={styles.minusText}>−</Text>
              </Pressable>
              <View style={styles.countBox}>
                <Text style={styles.count}>
                  {count}
                  {target ? <Text style={styles.countTarget}> / {target}</Text> : null}
                </Text>
                <Text style={styles.countLabel}>reps</Text>
              </View>
              <Pressable onPress={() => bump(1)} accessibilityLabel="Une rep de plus" style={styles.plus}>
                <Text style={styles.plusText}>+</Text>
              </Pressable>
            </View>
            {target && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct * 100}%` }, pct >= 1 && styles.fillDone]} />
              </View>
            )}
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
          <View style={styles.pair}>
            <Button title="Recommencer" variant="ghost" onPress={restart} style={styles.flex} />
            <Button
              title={finishLabel === 'Exercice suivant' ? 'Suivant' : 'Terminer'}
              onPress={onFinish}
              style={styles.flex}
            />
          </View>
        ) : running ? (
          <View style={styles.pair}>
            <Button title="Pause" variant="ghost" onPress={pause} style={styles.flex} />
            {!rounds && <Button title="Terminé" onPress={stop} style={styles.flex} />}
          </View>
        ) : elapsed > 0 ? (
          <View style={styles.pair}>
            <Button title="Recommencer" variant="ghost" onPress={restart} style={styles.flex} />
            <Button title="Reprendre" onPress={start} style={styles.flex} />
          </View>
        ) : (
          <Button title="Démarrer" onPress={start} style={styles.mainBtn} />
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
  off: { opacity: 0.35 },
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
  clock: {
    marginTop: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 104,
    lineHeight: 112,
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
  captionAccent: { color: colors.pinkDeep },
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

  counter: { alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  minus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusText: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textMuted, lineHeight: 26 },
  plus: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.pinkDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { fontFamily: fonts.bodyBold, fontSize: 36, color: colors.white, lineHeight: 38 },
  countBox: { minWidth: 96, alignItems: 'center' },
  count: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    letterSpacing: -1,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  countTarget: { fontSize: 22, color: colors.textLight },
  countLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  track: { width: '80%', maxWidth: 320, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.pink },
  fillDone: { backgroundColor: colors.pinkDeep },

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
