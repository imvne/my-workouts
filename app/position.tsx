import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { sessionsOf, summarize, useProgramStore } from '@/store/programStore';

export default function Position() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const program = useProgramStore((s) => s.program);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const setProgress = useProgramStore((s) => s.setProgress);
  const setDone = useProgramStore((s) => s.setDone);

  const [openWeek, setOpenWeek] = useState<number | null>(progress.week - 1);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  if (!program || program.weeks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Crée d’abord ta prog.</Text>
      </View>
    );
  }

  const allDone = (ids: string[]) => ids.length > 0 && ids.every((id) => done[id]);

  /** Position à reprendre : premier exo non coché dans l'ordre. */
  const recompute = (nextDone: Record<string, true>) => {
    for (let wi = 0; wi < program.weeks.length; wi++) {
      const sessions = sessionsOf(program, wi + 1);
      for (let si = 0; si < sessions.length; si++) {
        for (let ei = 0; ei < sessions[si].exercises.length; ei++) {
          if (!nextDone[sessions[si].exercises[ei].id]) {
            return setProgress({ week: wi + 1, session: si, exercise: ei, set: 0 });
          }
        }
      }
    }
    setProgress({ week: program.weeks.length, session: 0, exercise: 0, set: 0 });
  };

  const toggle = (ids: string[]) => {
    const value = !allDone(ids);
    setDone(ids, value);
    const next = { ...done };
    for (const id of ids) {
      if (value) next[id] = true;
      else delete next[id];
    }
    recompute(next);
  };

  const currentSessions = sessionsOf(program, progress.week);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable hitSlop={12} onPress={goBack} accessibilityLabel="Retour" style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          ),
        }}
      />

      {program.weeks.map((weekData, wi) => {
        const weekSessions = sessionsOf(program, wi + 1);
        const weekIds = weekSessions.flatMap((s) => s.exercises.map((e) => e.id));
        const wOpen = openWeek === wi;

        return (
          <View key={weekData.id} style={styles.week}>
            <View style={[styles.weekBar, wOpen && styles.weekBarOpen]}>
              <Pressable
                hitSlop={8}
                onPress={() => toggle(weekIds)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allDone(weekIds) }}
                accessibilityLabel={`Semaine ${wi + 1}`}
                style={[styles.weekCheck, allDone(weekIds) && styles.weekCheckDone]}
              >
                {allDone(weekIds) && <Text style={styles.weekCheckMark}>✓</Text>}
              </Pressable>
              <Pressable onPress={() => setOpenWeek(wOpen ? null : wi)} style={styles.rowLabel}>
                <Text style={styles.weekKicker}>Semaine</Text>
                <Text style={styles.weekNumber}>{wi + 1}</Text>
              </Pressable>
              <Pressable onPress={() => setOpenWeek(wOpen ? null : wi)} hitSlop={8}>
                <Text style={[styles.weekChevron, wOpen && styles.chevronOpen]}>›</Text>
              </Pressable>
            </View>

            {wOpen &&
              weekSessions.map((session, si) => {
                const sessionIds = session.exercises.map((e) => e.id);
                const sKey = `${wi}-${si}`;
                const sOpen = openSession === sKey;

                return (
                  <View key={session.id}>
                    <Row
                      label={session.title}
                      checked={allDone(sessionIds)}
                      current={progress.week === wi + 1 && progress.session === si}
                      open={sOpen}
                      level={1}
                      onToggle={() => setOpenSession(sOpen ? null : sKey)}
                      onCheck={() => toggle(sessionIds)}
                    />

                    {sOpen &&
                      session.exercises.map((exercise, ei) => {
                        const eKey = `${sKey}-${ei}`;
                        const eOpen = openExercise === eKey;
                        const eDone = !!done[exercise.id];
                        const eCurrent =
                          progress.week === wi + 1 && progress.session === si && progress.exercise === ei;

                        return (
                          <View key={exercise.id}>
                            <Row
                              label={exercise.name}
                              sub={[
                                summarize(exercise.reps) && `${summarize(exercise.reps)} reps`,
                                summarize(exercise.loads),
                              ]
                                .filter(Boolean)
                                .join(' — ')}
                              checked={eDone}
                              current={eCurrent}
                              open={eOpen}
                              level={2}
                              onToggle={() => setOpenExercise(eOpen ? null : eKey)}
                              onCheck={() => toggle([exercise.id])}
                            />

                            {eOpen && (
                              <View style={styles.sets}>
                                {Array.from({ length: exercise.sets }, (_, k) => {
                                  const setDoneHere = eDone || (eCurrent && k < progress.set);
                                  return (
                                    <Pressable
                                      key={k}
                                      onPress={() => {
                                        setDone([exercise.id], false);
                                        setProgress(
                                          { week: wi + 1, session: si, exercise: ei, set: k },
                                          true,
                                        );
                                      }}
                                      style={[styles.setPill, setDoneHere && styles.setPillDone]}
                                    >
                                      <Text
                                        style={[styles.setPillText, setDoneHere && styles.setPillTextDone]}
                                      >
                                        {setDoneHere ? '✓' : k + 1}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                  </View>
                );
              })}
          </View>
        );
      })}

      <Button
        title={`Continuer semaine ${progress.week} · ${currentSessions[progress.session]?.title ?? ''}`}
        onPress={goBack}
        style={styles.back}
      />
    </ScrollView>
  );
}

function Row({
  label,
  sub,
  checked,
  current,
  open,
  level,
  onToggle,
  onCheck,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  current: boolean;
  open: boolean;
  level: 1 | 2;
  onToggle: () => void;
  onCheck: () => void;
}) {
  return (
    <View style={[styles.row, { paddingLeft: spacing.md + level * spacing.lg }]}>
      <Pressable
        hitSlop={8}
        onPress={onCheck}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={[styles.check, checked && styles.checkDone]}
      >
        {checked && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>
      <Pressable onPress={onToggle} style={styles.rowLabel}>
        <Text
          style={[
            level === 1 ? styles.labelL1 : styles.labelL2,
            !checked && !current && styles.labelTodo,
            current && !checked && styles.labelCurrent,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!!sub && (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </Pressable>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Text style={[styles.chevron, open && styles.chevronOpen]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  back: { marginTop: spacing.md },
  backBtn: { marginLeft: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.sm },
  backArrow: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 28, color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted },

  week: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.xs,
    overflow: 'hidden',
  },
  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.backgroundAlt,
  },
  weekBarOpen: { borderBottomWidth: 1, borderBottomColor: colors.border },
  weekCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCheckDone: { backgroundColor: colors.pinkDeep, borderColor: colors.pinkDeep },
  weekCheckMark: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.white },
  weekKicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  weekNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -1,
    color: colors.text,
  },
  weekChevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.pinkSoft, borderColor: colors.pinkSoft },
  checkMark: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.pinkDeep },
  rowLabel: { flex: 1 },
  labelL1: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  labelL2: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  labelTodo: { color: colors.textMuted },
  labelCurrent: { color: colors.pinkDeep },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.pinkDeep, marginTop: 2 },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.textLight,
    paddingHorizontal: spacing.xs,
  },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: spacing.md + 2 * spacing.lg + 26 + spacing.md,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  setPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPillDone: { backgroundColor: colors.pinkSoft, borderColor: colors.pinkSoft },
  setPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textLight },
  setPillTextDone: { color: colors.pinkDeep },
});
