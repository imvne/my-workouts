import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { RestTimer } from '@/components/workout/RestTimer';
import { Stats } from '@/components/workout/Stats';
import { fmtClock } from '@/components/workout/TimedExercise';
import { TimedExercise } from '@/components/workout/TimedExercise';
import { formatOf, parseRest } from '@/lib/formats';
import { groupBounds, nextStep, prevStep } from '@/lib/superset';
import { signOut } from '@/lib/sync';
import { sessionsOf, useProgramStore, valueFor } from '@/store/programStore';

export default function Home() {
  const router = useRouter();
  const program = useProgramStore((s) => s.program);
  const progress = useProgramStore((s) => s.progress);
  const setProgress = useProgramStore((s) => s.setProgress);
  const setDone = useProgramStore((s) => s.setDone);
  const sessionStarted = useProgramStore((s) => s.sessionStarted);
  const startSession = useProgramStore((s) => s.startSession);
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const onImmersiveChange = useCallback((v: boolean) => setImmersive(v), []);
  const [tint, setTint] = useState<string | null>(null);
  const onTint = useCallback((c: string | null) => setTint(c), []);
  const [rest, setRest] = useState<{ endAt: number; total: number } | null>(null);
  const endRest = useCallback(() => setRest(null), []);

  const headerLeft = () => (
    <Pressable hitSlop={12} onPress={() => setMenuOpen(true)} accessibilityLabel="Menu" style={styles.burger}>
      <View style={styles.burgerBar} />
      <View style={styles.burgerBar} />
      <View style={styles.burgerBar} />
    </Pressable>
  );

  const headerRight = () => (
    <Pressable hitSlop={12} onPress={() => router.push('/edit')} style={styles.editBtn}>
      <Text style={styles.editText}>{program ? 'Éditer' : 'Créer'}</Text>
    </Pressable>
  );

  const plainOptions = {
    contentStyle: { backgroundColor: colors.background },
    headerStyle: { backgroundColor: colors.background },
  };

  const menu = (
    <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
      <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
        <Pressable
          style={[styles.menuPanel, { paddingTop: insets.top + spacing.lg }]}
          onPress={() => setSpaceOpen(false)}
        >
          <Text style={styles.menuLabel}>Espace</Text>
          <View style={styles.select}>
            <Pressable
              onPress={() => setSpaceOpen((v) => !v)}
              style={[styles.selectHead, spaceOpen && styles.selectHeadOpen]}
            >
              <Text style={styles.selectValue}>Autocoaching</Text>
              <Text style={[styles.selectChevron, spaceOpen && styles.selectChevronOpen]}>›</Text>
            </Pressable>
            {spaceOpen && (
              <View style={styles.selectList}>
                <Pressable
                  onPress={() => {
                    setSpaceOpen(false);
                    setMenuOpen(false);
                  }}
                  style={styles.selectOption}
                >
                  <Text style={styles.selectOptionText}>Autocoaching</Text>
                  <Text style={styles.menuCheck}>✓</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push('/position');
            }}
            style={styles.menuLink}
          >
            <Text style={styles.menuLinkText}>Où j’en suis</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push('/transfer');
            }}
            style={styles.menuLink}
          >
            <Text style={styles.menuLinkText}>Sauvegarde & import</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push('/library');
            }}
            style={styles.menuLink}
          >
            <Text style={styles.menuLinkText}>Bibliothèque</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              signOut();
            }}
            style={[styles.menuLink, styles.menuLogout]}
          >
            <Text style={styles.menuLogoutText}>Se déconnecter</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const sessions = program ? sessionsOf(program, progress.week) : [];

  if (!program || sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ headerLeft, headerRight, headerShown: true, ...plainOptions }} />
        {menu}
        <Text style={styles.emptyTitle}>Ton espace est vide</Text>
        <Button title="Créer ma prog" onPress={() => router.push('/edit')} />
      </View>
    );
  }

  const sessionIndex = Math.min(progress.session, sessions.length - 1);
  const session = sessions[sessionIndex];
  const exercises = session.exercises;
  const exerciseIndex = Math.min(progress.exercise, exercises.length - 1);
  const current = exercises[exerciseIndex];
  const setIndex = Math.min(progress.set ?? 0, current.sets - 1);
  // Superset : les exos liés forment un groupe parcouru série par série.
  const [groupStart, groupEnd] = groupBounds(exercises, exerciseIndex);
  const inSuperset = groupEnd > groupStart;
  const step = nextStep(exercises, exerciseIndex, setIndex);
  const next = exercises[groupEnd + 1];
  const isLastSet = step === null;
  const isLastExercise = groupEnd === exercises.length - 1;
  const isLastSession = sessionIndex === sessions.length - 1;
  const isLastWeek = progress.week >= program.weeks.length;

  const goToNextExercise = () => {
    if (!isLastExercise) {
      setProgress({ ...progress, session: sessionIndex, exercise: groupEnd + 1, set: 0 }, true);
    } else if (!isLastSession) {
      setProgress({ ...progress, session: sessionIndex + 1, exercise: 0, set: 0 });
    } else if (!isLastWeek) {
      setProgress({ week: progress.week + 1, session: 0, exercise: 0, set: 0 });
    } else {
      setProgress({ week: 1, session: 0, exercise: 0, set: 0 });
    }
  };

  const startRest = () => {
    // Superset : le repos est celui du dernier exo du groupe (sinon celui de l'exo en cours).
    const seconds = parseRest(exercises[groupEnd].rest) || parseRest(current.rest);
    if (seconds > 0) setRest({ endAt: Date.now() + seconds * 1000, total: seconds * 1000 });
  };

  const goNext = () => {
    if (step) {
      setProgress({ ...progress, session: sessionIndex, exercise: step.exercise, set: step.set }, true);
      if (step.roundEnd) startRest(); // pas de repos entre A et B d'un superset
      return;
    }
    setDone(exercises.slice(groupStart, groupEnd + 1).map((e) => e.id), true);
    if (!isLastExercise) startRest();
    goToNextExercise();
  };

  const goPrev = () => {
    const back = prevStep(exercises, exerciseIndex, setIndex);
    if (back) {
      setProgress({ ...progress, session: sessionIndex, exercise: back.exercise, set: back.set }, true);
    } else if (exerciseIndex > 0) {
      const prev = exercises[exerciseIndex - 1];
      setProgress(
        { ...progress, session: sessionIndex, exercise: exerciseIndex - 1, set: prev.sets - 1 },
        true,
      );
    } else if (sessionIndex > 0) {
      const prevSession = sessions[sessionIndex - 1];
      const prev = prevSession.exercises[prevSession.exercises.length - 1];
      setProgress(
        {
          ...progress,
          session: sessionIndex - 1,
          exercise: prevSession.exercises.length - 1,
          set: prev.sets - 1,
        },
        true,
      );
    }
  };

  const canGoPrev = setIndex > 0 || exerciseIndex > 0 || sessionIndex > 0;
  const nextLabel = step
    ? step.exercise !== exerciseIndex
      ? 'Enchaîner'
      : 'Série suivante'
    : !isLastExercise
      ? 'Exercice suivant'
      : 'Séance terminée';
  const nextHint = step && step.exercise !== exerciseIndex
    ? `${exercises[step.exercise].name} · série ${step.set + 1}`
    : next
    ? next.name
    : isLastSession
      ? isLastWeek
        ? 'Fin du bloc'
        : `Semaine ${progress.week + 1}`
      : sessions[sessionIndex + 1].title;

  if (!sessionStarted) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Stack.Screen options={{ headerLeft, headerRight, headerShown: true, ...plainOptions }} />
        {menu}
        <View />
        <View style={styles.intro}>
          <Text style={styles.introWeek}>Semaine {progress.week}</Text>
          <Text style={styles.introTitle} adjustsFontSizeToFit numberOfLines={2}>
            {session.title}
          </Text>
          <Text style={styles.introMeta}>
            {exercises.length} exo{exercises.length > 1 ? 's' : ''} ·{' '}
            {exercises.reduce((n, e) => n + e.sets, 0)} séries
          </Text>
        </View>
        <View style={styles.bottom}>
          <Button title="Commencer la séance" onPress={startSession} style={styles.mainBtn} />
          <Pressable onPress={() => router.push('/position')} hitSlop={8} style={styles.prev}>
            <Text style={styles.prevText}>Changer de séance</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const reps = valueFor(current.reps, setIndex);
  const load = valueFor(current.loads, setIndex);
  const timed = ['emom', 'amrap', 'fortime'].includes(formatOf(current));

  const top = (
      <View style={[styles.top, immersive && styles.hidden]}>
        <Pressable onPress={() => router.push('/position')} hitSlop={8} style={styles.contextBtn}>
          <Text style={styles.context}>
            Semaine {progress.week} · {session.title}
          </Text>
          <Text style={styles.contextChevron}>›</Text>
        </Pressable>
        <View style={styles.dots} accessibilityLabel={`Exo ${exerciseIndex + 1} sur ${exercises.length}`}>
          {exercises.map((e, i) => (
            <View
              key={e.id}
              style={[styles.dot, i < exerciseIndex && styles.dotDone, i === exerciseIndex && styles.dotCurrent]}
            />
          ))}
        </View>
      </View>
  );

  // Fond de l'écran selon la phase (repos rose, préparation grise), header compris.
  const phaseOptions = (color: string | null) =>
    color ? { contentStyle: { backgroundColor: color }, headerStyle: { backgroundColor: color } } : {};

  if (rest) {
    const upReps = valueFor(current.reps, setIndex);
    const upLoad = valueFor(current.loads, setIndex);
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Stack.Screen options={{ headerLeft, headerRight, headerShown: true, ...phaseOptions(colors.pinkSoft) }} />
        {menu}
        <RestTimer
          endAt={rest.endAt}
          total={rest.total}
          nextTitle={`Série ${setIndex + 1} / ${current.sets} · ${current.name}`}
          nextDetail={[upReps && `${upReps} reps`, upLoad].filter(Boolean).join(' · ')}
          onAdd={(ms) => setRest((r) => (r ? { endAt: r.endAt + ms, total: r.total + ms } : r))}
          onDone={endRest}
        />
      </View>
    );
  }

  if (timed) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Stack.Screen options={{ headerLeft, headerRight, headerShown: !immersive, ...phaseOptions(tint) }} />
        {menu}
        {top}
        <TimedExercise
          key={current.id}
          exercise={current}
          setIndex={setIndex}
          onSetChange={(set) =>
            setProgress({ ...progress, session: sessionIndex, exercise: exerciseIndex, set }, true)
          }
          onFinish={() => {
            setDone([current.id], true);
            goToNextExercise();
          }}
          finishLabel={isLastExercise ? 'Séance terminée' : 'Exercice suivant'}
          onPrev={goPrev}
          canPrev={canGoPrev}
          onSkip={goToNextExercise}
          nextHint={nextHint}
          onImmersiveChange={onImmersiveChange}
          onTint={onTint}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen
        options={{
          headerLeft,
          headerRight,
          headerShown: true,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
        }}
      />
      {menu}
      {top}

      <View style={styles.center}>
        {inSuperset && (
          <Text style={styles.superset}>
            Superset · {exerciseIndex - groupStart + 1} / {groupEnd - groupStart + 1}
          </Text>
        )}
        <Text style={styles.exerciseName} adjustsFontSizeToFit numberOfLines={3}>
          {current.name}
        </Text>

        <View style={styles.statsBlock}>
          <Stats reps={reps} load={load} />
        </View>

        <Text style={styles.setCaption}>
          Série <Text style={styles.setCaptionNow}>{setIndex + 1}</Text> / {current.sets}
        </Text>
        <View style={styles.sets}>
          {Array.from({ length: Math.ceil(current.sets / 5) }, (_, row) => (
            <View key={row} style={styles.setsRow}>
              {Array.from({ length: Math.min(5, current.sets - row * 5) }, (_, col) => row * 5 + col).map(
                (i) => (
                  <Pressable
                    key={i}
                    onPress={() =>
                      setProgress(
                        { ...progress, session: sessionIndex, exercise: exerciseIndex, set: i },
                        true,
                      )
                    }
                    style={[
                      styles.setPill,
                      i < setIndex && styles.setPillDone,
                      i === setIndex && styles.setPillCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.setPillText,
                        i < setIndex && styles.setPillTextDone,
                        i === setIndex && styles.setPillTextOn,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
        {parseRest(exercises[groupEnd].rest || current.rest) > 0 && (
          <Text style={styles.restHint}>
            Repos {fmtClock(parseRest(exercises[groupEnd].rest || current.rest) * 1000)}
          </Text>
        )}
      </View>

      <View style={styles.bottom}>
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>{next ? 'Prochain exo' : 'Ensuite'}</Text>
          <Text style={styles.nextName} numberOfLines={1}>
            {nextHint}
          </Text>
        </View>
        <Button title={nextLabel} onPress={goNext} style={styles.mainBtn} />
        <View style={styles.subActions}>
          <Pressable onPress={goPrev} disabled={!canGoPrev} hitSlop={10} style={!canGoPrev && styles.hidden}>
            <Text style={styles.prevText}>← Précédent</Text>
          </Pressable>
          <Pressable onPress={goToNextExercise} hitSlop={10}>
            <Text style={styles.prevText}>Passer →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  burger: { marginLeft: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  burgerBar: { width: 20, height: 2, borderRadius: 1, backgroundColor: colors.text },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(74, 59, 54, 0.35)' },
  menuPanel: {
    width: 280,
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -spacing.sm,
  },
  select: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  selectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectHeadOpen: { borderBottomWidth: 1, borderBottomColor: colors.border },
  selectValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  selectChevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 22,
    color: colors.textLight,
    transform: [{ rotate: '90deg' }],
  },
  selectChevronOpen: { transform: [{ rotate: '-90deg' }] },
  selectList: { backgroundColor: colors.background },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  selectOptionText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  menuCheck: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.pinkDeep },
  menuLink: { paddingVertical: spacing.sm },
  menuLogout: { marginTop: 'auto', marginBottom: spacing.xl },
  menuLogoutText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  menuLinkText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.pinkDeep },

  editBtn: { marginRight: spacing.md, paddingVertical: spacing.xs },
  editText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.pinkDeep },

  empty: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 32, letterSpacing: -1, color: colors.text },

  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { gap: spacing.md, paddingTop: spacing.sm },
  contextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  contextChevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 18,
    color: colors.textLight,
    transform: [{ rotate: '90deg' }],
  },
  context: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', alignSelf: 'stretch', gap: spacing.sm },
  dot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.pinkSoft },
  dotDone: { backgroundColor: colors.pinkDeep },
  dotCurrent: { backgroundColor: colors.pinkDeep, flex: 2 },

  center: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  statsBlock: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  setCaption: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  setCaptionNow: { color: colors.pinkDeep },
  restHint: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textLight,
    letterSpacing: 0.4,
  },
  exerciseName: {
    fontFamily: fonts.displayBold,
    fontSize: 38,
    lineHeight: 42,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  superset: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: colors.pinkSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  badgeText: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.5, color: colors.pinkDeep },
  sets: { gap: spacing.sm, marginTop: spacing.sm },
  setsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  setPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPillDone: { backgroundColor: colors.pinkSoft, borderColor: colors.pinkSoft },
  setPillCurrent: { backgroundColor: colors.pinkDeep, borderColor: colors.pinkDeep },
  setPillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textLight },
  setPillTextDone: { color: colors.pinkDeep },
  setPillTextOn: { color: colors.white },

  intro: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  introWeek: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  introTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
    color: colors.text,
    textAlign: 'center',
  },
  introMeta: { fontFamily: fonts.body, fontSize: 15, color: colors.pinkDeep },

  bottom: { gap: spacing.md },
  nextBox: {
    backgroundColor: colors.surface,
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
  subActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  prev: { alignItems: 'center', paddingVertical: spacing.xs },
  hidden: { opacity: 0 },
  prevText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
});
