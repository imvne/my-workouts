import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { difficultyFor, doneKey, normalizeProgram, useProgramStore } from '@/store/programStore';
import type { ProgramProgress } from '@/types/program';

export default function Position() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawProgram = useProgramStore((s) => s.program);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const setProgress = useProgramStore((s) => s.setProgress);
  const setDone = useProgramStore((s) => s.setDone);

  const program = rawProgram ? normalizeProgram(rawProgram) : null;
  const sessions = program?.sessions.filter((s) => s.exercises.length > 0) ?? [];

  const [openWeek, setOpenWeek] = useState<number | null>(progress.week);
  const [openSession, setOpenSession] = useState<string | null>(
    `${progress.week}-${progress.session}`,
  );
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  if (!program || sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Crée d’abord ta prog.</Text>
      </View>
    );
  }

  const keysOf = (week: number, si: number, ei?: number) =>
    (ei == null ? sessions[si].exercises : [sessions[si].exercises[ei]]).map((e) =>
      doneKey(week, sessions[si].id, e.id),
    );
  const keysOfWeek = (week: number) => sessions.flatMap((_, si) => keysOf(week, si));
  const allDone = (keys: string[]) => keys.length > 0 && keys.every((k) => done[k]);

  // Position à reprendre : premier exo non coché dans l'ordre chronologique.
  const recomputeProgress = (nextDone: Record<string, true>) => {
    for (let week = 1; week <= program.weeks; week++) {
      for (let si = 0; si < sessions.length; si++) {
        const s = sessions[si];
        for (let ei = 0; ei < s.exercises.length; ei++) {
          if (!nextDone[doneKey(week, s.id, s.exercises[ei].id)]) {
            return setProgress({ week, session: si, exercise: ei, set: 0 });
          }
        }
      }
    }
    // Tout est coché : fin du bloc.
    const lastS = sessions.length - 1;
    const lastE = sessions[lastS].exercises.length - 1;
    setProgress({
      week: program.weeks,
      session: lastS,
      exercise: lastE,
      set: sessions[lastS].exercises[lastE].sets - 1,
    });
  };

  const toggle = (keys: string[]) => {
    const value = !allDone(keys);
    setDone(keys, value);
    const next = { ...done };
    for (const k of keys) {
      if (value) next[k] = true;
      else delete next[k];
    }
    recomputeProgress(next);
  };

  const isCurrent = (week: number, si?: number, ei?: number) =>
    progress.week === week &&
    (si == null || progress.session === si) &&
    (ei == null || progress.exercise === ei);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.hint}>Coche ce qui est fait, décoche pour y revenir. Le nom déplie.</Text>

      {Array.from({ length: program.weeks }, (_, wi) => wi + 1).map((week) => {
        const wKeys = keysOfWeek(week);
        const wOpen = openWeek === week;

        return (
          <View key={week} style={styles.week}>
            <Row
              label={`Semaine ${week}`}
              checked={allDone(wKeys)}
              current={isCurrent(week)}
              open={wOpen}
              level={0}
              onToggle={() => setOpenWeek(wOpen ? null : week)}
              onCheck={() => toggle(wKeys)}
            />

            {wOpen &&
              sessions.map((session, si) => {
                const sKeys = keysOf(week, si);
                const sKey = `${week}-${si}`;
                const sOpen = openSession === sKey;

                return (
                  <View key={session.id}>
                    <Row
                      label={session.title}
                      checked={allDone(sKeys)}
                      current={isCurrent(week, si)}
                      open={sOpen}
                      level={1}
                      onToggle={() => setOpenSession(sOpen ? null : sKey)}
                      onCheck={() => toggle(sKeys)}
                    />

                    {sOpen &&
                      session.exercises.map((exercise, ei) => {
                        const eKeys = keysOf(week, si, ei);
                        const eDone = allDone(eKeys);
                        const eCurrent = isCurrent(week, si, ei);
                        const eKey = `${sKey}-${ei}`;
                        const eOpen = openExercise === eKey;

                        return (
                          <View key={exercise.id}>
                            <Row
                              label={exercise.name}
                              sub={difficultyFor(exercise, week)}
                              checked={eDone}
                              current={eCurrent}
                              open={eOpen}
                              level={2}
                              onToggle={() => setOpenExercise(eOpen ? null : eKey)}
                              onCheck={() => toggle(eKeys)}
                            />

                            {eOpen && (
                              <View style={styles.sets}>
                                {Array.from({ length: exercise.sets }, (_, k) => {
                                  const setDoneHere = eDone || (eCurrent && k < progress.set);
                                  return (
                                    <Pressable
                                      key={k}
                                      onPress={() => {
                                        // Reprendre à cette série : l'exo redevient « en cours ».
                                        setDone(eKeys, false);
                                        setProgress({ week, session: si, exercise: ei, set: k }, true);
                                      }}
                                      style={[styles.setPill, setDoneHere && styles.setPillDone]}
                                    >
                                      <Text
                                        style={[
                                          styles.setPillText,
                                          setDoneHere && styles.setPillTextDone,
                                        ]}
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
        title={`Continuer semaine ${progress.week} · ${sessions[progress.session]?.title ?? ''}`}
        onPress={() => router.back()}
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
  level: 0 | 1 | 2;
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
            level === 0 ? styles.labelL0 : level === 1 ? styles.labelL1 : styles.labelL2,
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
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  back: { marginTop: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  week: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
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
  labelL0: { fontFamily: fonts.displayBold, fontSize: 20, letterSpacing: -0.5, color: colors.text },
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
