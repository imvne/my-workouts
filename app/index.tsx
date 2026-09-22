import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import {
  doneKey,
  loadFor,
  normalizeProgram,
  repFor,
  useProgramStore,
} from '@/store/programStore';

export default function Home() {
  const router = useRouter();
  const rawProgram = useProgramStore((s) => s.program);
  const program = rawProgram ? normalizeProgram(rawProgram) : null;
  const progress = useProgramStore((s) => s.progress);
  const setProgress = useProgramStore((s) => s.setProgress);
  const setDone = useProgramStore((s) => s.setDone);
  const sessionStarted = useProgramStore((s) => s.sessionStarted);
  const startSession = useProgramStore((s) => s.startSession);
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [spaceOpen, setSpaceOpen] = useState(false);

  const headerLeft = () => (
    <Pressable
      hitSlop={12}
      onPress={() => setMenuOpen(true)}
      accessibilityLabel="Menu"
      style={styles.burger}
    >
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

  const menu = (
    <Modal
      visible={menuOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuOpen(false)}
    >
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
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (!program) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ headerLeft, headerRight }} />
        {menu}
        <Text style={styles.emptyTitle}>Ton espace est vide</Text>

        <Button title="Créer ma prog" onPress={() => router.push('/edit')} />
      </View>
    );
  }

  const sessions = program.sessions.filter((s) => s.exercises.length > 0);
  const sessionIndex = Math.min(progress.session, sessions.length - 1);
  const session = sessions[sessionIndex];
  const exercises = session.exercises;
  const exerciseIndex = Math.min(progress.exercise, exercises.length - 1);
  const current = exercises[exerciseIndex];
  const setIndex = Math.min(progress.set ?? 0, current.sets - 1);
  const next = exercises[exerciseIndex + 1];
  const isLastSet = setIndex >= current.sets - 1;
  const isLastExercise = exerciseIndex === exercises.length - 1;
  const isLastSession = sessionIndex === sessions.length - 1;
  const isLastWeek = progress.week >= program.weeks;

  const goNext = () => {
    if (!isLastSet) {
      setProgress(
        { ...progress, session: sessionIndex, exercise: exerciseIndex, set: setIndex + 1 },
        true,
      );
      return;
    }
    setDone([doneKey(progress.week, session.id, current.id)], true);
    if (!isLastExercise) {
      setProgress(
        { ...progress, session: sessionIndex, exercise: exerciseIndex + 1, set: 0 },
        true,
      );
    } else if (!isLastSession) {
      setProgress({ ...progress, session: sessionIndex + 1, exercise: 0, set: 0 });
    } else if (!isLastWeek) {
      setProgress({ week: progress.week + 1, session: 0, exercise: 0, set: 0 });
    } else {
      setProgress({ week: 1, session: 0, exercise: 0, set: 0 });
    }
  };

  const goPrev = () => {
    if (setIndex > 0) {
      setProgress(
        { ...progress, session: sessionIndex, exercise: exerciseIndex, set: setIndex - 1 },
        true,
      );
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
  const nextLabel = !isLastSet
    ? 'Série suivante'
    : !isLastExercise
      ? 'Exercice suivant'
      : 'Séance terminée';
  const nextHint = next
    ? next.name
    : isLastSession
      ? isLastWeek
        ? 'Fin du bloc'
        : `Semaine ${progress.week + 1}`
      : sessions[sessionIndex + 1].title;

  if (!sessionStarted) {
    return (
      <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Stack.Screen options={{ headerLeft, headerRight }} />
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

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ headerLeft, headerRight }} />
      {menu}

      <View style={styles.top}>
        <Pressable onPress={() => router.push('/position')} hitSlop={8} style={styles.contextBtn}>
          <Text style={styles.context}>
            Semaine {progress.week} · {session.title}
          </Text>
          <Text style={styles.contextChevron}>›</Text>
        </Pressable>
        <View
          style={styles.dots}
          accessibilityLabel={`Exo ${exerciseIndex + 1} sur ${exercises.length}`}
        >
          {exercises.map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.dot,
                i < exerciseIndex && styles.dotDone,
                i === exerciseIndex && styles.dotCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.exerciseName} adjustsFontSizeToFit numberOfLines={3}>
          {current.name}
        </Text>
        <View style={styles.badges}>
          {!!repFor(current, progress.week, setIndex) && (
            <View style={styles.loadBadge}>
              <Text style={styles.loadText}>{repFor(current, progress.week, setIndex)} reps</Text>
            </View>
          )}
          {!!loadFor(current, progress.week, setIndex) && (
            <View style={styles.loadBadge}>
              <Text style={styles.loadText}>{loadFor(current, progress.week, setIndex)}</Text>
            </View>
          )}
        </View>
        <View style={styles.sets}>
          {Array.from({ length: Math.ceil(current.sets / 5) }, (_, row) => (
            <View key={row} style={styles.setsRow}>
              {Array.from(
                { length: Math.min(5, current.sets - row * 5) },
                (_, col) => row * 5 + col,
              ).map((i) => (
                <View
                  key={i}
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
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>{next ? 'Prochain exo' : 'Ensuite'}</Text>
          <Text style={styles.nextName} numberOfLines={1}>
            {nextHint}
          </Text>
        </View>
        <Button title={nextLabel} onPress={goNext} style={styles.mainBtn} />
        <Pressable
          onPress={goPrev}
          disabled={!canGoPrev}
          hitSlop={10}
          style={[styles.prev, !canGoPrev && styles.prevHidden]}
        >
          <Text style={styles.prevText}>← Précédent</Text>
        </Pressable>
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
  menuLink: { paddingVertical: spacing.sm, marginTop: spacing.md },
  menuLinkText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.pinkDeep },

  editBtn: { marginRight: spacing.md, paddingVertical: spacing.xs },
  editText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.pinkDeep },

  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: -1,
    color: colors.text,
  },

  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { gap: spacing.md, paddingTop: spacing.sm },
  contextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
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
  dots: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  dot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pinkSoft,
  },
  dotDone: { backgroundColor: colors.pinkDeep },
  dotCurrent: {
    backgroundColor: colors.pinkDeep,
    flex: 2,
  },

  center: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  exerciseName: {
    fontFamily: fonts.displayBold,
    fontSize: 38,
    lineHeight: 42,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -1.5,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  loadBadge: {
    backgroundColor: colors.pinkSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  loadText: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: colors.pinkDeep,
  },
  sets: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
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
  nextName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  mainBtn: { paddingVertical: spacing.md + 4 },
  prev: { alignItems: 'center', paddingVertical: spacing.xs },
  prevHidden: { opacity: 0 },
  prevText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
});
