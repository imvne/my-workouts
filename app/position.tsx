import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { difficultyFor, normalizeProgram, useProgramStore } from '@/store/programStore';
import type { ProgramProgress } from '@/types/program';

type Status = 'done' | 'current' | 'todo';

/** Ordre linéaire d'une position dans le bloc. */
function rank(p: ProgramProgress) {
  return [p.week, p.session, p.exercise, p.set] as const;
}

function compare(a: ProgramProgress, b: ProgramProgress): number {
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return 0;
}

export default function Position() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rawProgram = useProgramStore((s) => s.program);
  const progress = useProgramStore((s) => s.progress);
  const setProgress = useProgramStore((s) => s.setProgress);

  const program = rawProgram ? normalizeProgram(rawProgram) : null;
  const sessions = program?.sessions.filter((s) => s.exercises.length > 0) ?? [];

  const [openWeek, setOpenWeek] = useState<number | null>(progress.week);
  const [openSession, setOpenSession] = useState<string | null>(`${progress.week}-${progress.session}`);
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  if (!program || sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Crée d’abord ta prog.</Text>
      </View>
    );
  }

  // Statut d'un nœud : comparé à la position courante, sur son premier et dernier élément.
  const statusOf = (start: ProgramProgress, end: ProgramProgress): Status => {
    if (compare(end, progress) < 0) return 'done';
    if (compare(start, progress) > 0) return 'todo';
    return 'current';
  };

  // Position juste après `p` (série suivante, sinon exo, séance, semaine). Fin du bloc : on reste.
  const after = (p: ProgramProgress): ProgramProgress => {
    const ex = sessions[p.session].exercises[p.exercise];
    if (p.set + 1 < ex.sets) return { ...p, set: p.set + 1 };
    if (p.exercise + 1 < sessions[p.session].exercises.length)
      return { ...p, exercise: p.exercise + 1, set: 0 };
    if (p.session + 1 < sessions.length) return { ...p, session: p.session + 1, exercise: 0, set: 0 };
    if (p.week + 1 <= program.weeks) return { week: p.week + 1, session: 0, exercise: 0, set: 0 };
    return p;
  };

  // Cocher = tout ce qui est jusqu'à `end` est fait ; décocher = on reprend à `start`.
  const toggle = (start: ProgramProgress, end: ProgramProgress, status: Status) => {
    setProgress(status === 'done' ? start : after(end));
  };

  const lastOf = (week: number, session: number, exercise?: number): ProgramProgress => {
    const s = sessions[session];
    const ei = exercise ?? s.exercises.length - 1;
    return { week, session, exercise: ei, set: s.exercises[ei].sets - 1 };
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={styles.hint}>Coche ce qui est fait, décoche pour y revenir. Le nom déplie.</Text>

      {Array.from({ length: program.weeks }, (_, wi) => wi + 1).map((week) => {
        const weekStart = { week, session: 0, exercise: 0, set: 0 };
        const weekEnd = lastOf(week, sessions.length - 1);
        const wStatus = statusOf(weekStart, weekEnd);
        const wOpen = openWeek === week;

        return (
          <View key={week} style={styles.week}>
            <Row
              label={`Semaine ${week}`}
              status={wStatus}
              open={wOpen}
              level={0}
              onToggle={() => setOpenWeek(wOpen ? null : week)}
              onToggleDone={() => toggle(weekStart, weekEnd, wStatus)}
            />

            {wOpen &&
              sessions.map((session, si) => {
                const sStart = { week, session: si, exercise: 0, set: 0 };
                const sEnd = lastOf(week, si);
                const sStatus = statusOf(sStart, sEnd);
                const sKey = `${week}-${si}`;
                const sOpen = openSession === sKey;

                return (
                  <View key={session.id}>
                    <Row
                      label={session.title}
                      status={sStatus}
                      open={sOpen}
                      level={1}
                      onToggle={() => setOpenSession(sOpen ? null : sKey)}
                      onToggleDone={() => toggle(sStart, sEnd, sStatus)}
                    />

                    {sOpen &&
                      session.exercises.map((exercise, ei) => {
                        const eStart = { week, session: si, exercise: ei, set: 0 };
                        const eEnd = lastOf(week, si, ei);
                        const eStatus = statusOf(eStart, eEnd);
                        const eKey = `${sKey}-${ei}`;
                        const eOpen = openExercise === eKey;

                        return (
                          <View key={exercise.id}>
                            <Row
                              label={exercise.name}
                              sub={difficultyFor(exercise, week)}
                              status={eStatus}
                              open={eOpen}
                              level={2}
                              onToggle={() => setOpenExercise(eOpen ? null : eKey)}
                              onToggleDone={() => toggle(eStart, eEnd, eStatus)}
                            />

                            {eOpen && (
                              <View style={styles.sets}>
                                {Array.from({ length: exercise.sets }, (_, k) => {
                                  const p = { week, session: si, exercise: ei, set: k };
                                  const st = statusOf(p, p);
                                  return (
                                    <Pressable
                                      key={k}
                                      onPress={() => toggle(p, p, st)}
                                      style={[styles.setPill, st === 'done' && styles.setPillDone]}
                                    >
                                      <Text
                                        style={[
                                          styles.setPillText,
                                          st === 'done' && styles.setPillTextDone,
                                        ]}
                                      >
                                        {st === 'done' ? '✓' : k + 1}
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
  status,
  open,
  level,
  onToggle,
  onToggleDone,
}: {
  label: string;
  sub?: string;
  status: Status;
  open: boolean;
  level: 0 | 1 | 2;
  onToggle: () => void;
  onToggleDone: () => void;
}) {
  return (
    <View style={[styles.row, { paddingLeft: spacing.md + level * spacing.lg }]}>
      <Pressable
        hitSlop={8}
        onPress={onToggleDone}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: status === 'done' }}
        accessibilityLabel={label}
        style={[styles.check, status === 'done' && styles.checkDone]}
      >
        {status === 'done' && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>
      <Pressable onPress={onToggle} style={styles.rowLabel}>
        <Text
          style={[
            level === 0 ? styles.labelL0 : level === 1 ? styles.labelL1 : styles.labelL2,
            status === 'todo' && styles.labelTodo,
            status === 'current' && styles.labelCurrent,
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
