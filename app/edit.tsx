import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/ui/DownloadIcon';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { canUseFiles, downloadCsv, pickCsv } from '@/lib/csvFile';
import { csvToProgram, programToCsv } from '@/lib/programCsv';
import {
  cloneExercise,
  cloneSession,
  cloneWeek,
  newExercise,
  newProgram,
  newSession,
  useProgramStore,
} from '@/store/programStore';
import type { Program, ProgramExercise, ProgramSession } from '@/types/program';

function move<T>(list: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function trimSeries(values: string[]): string[] {
  const trimmed = values.map((v) => v.trim());
  return trimmed.some(Boolean) ? trimmed : [];
}

export default function EditProgram() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const saved = useProgramStore((s) => s.program);
  const saveProgram = useProgramStore((s) => s.saveProgram);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const importProgram = useProgramStore((s) => s.importProgram);

  const [program, setProgram] = useState<Program>(() => saved ?? newProgram());
  const [wi, setWi] = useState(() => Math.min(progress.week - 1, (saved?.weeks.length ?? 1) - 1));
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () =>
      new Set(
        (saved?.weeks[0]?.sessions ?? [])
          .filter((x) => x.exercises.some((e) => e.name.trim()))
          .map((x) => x.id),
      ),
  );

  const week = program.weeks[wi] ?? program.weeks[0];
  const sessions = week?.sessions ?? [];

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const updateWeek = (patch: (sessions: ProgramSession[]) => ProgramSession[]) =>
    setProgram((p) => ({
      ...p,
      weeks: p.weeks.map((w, i) => (i === wi ? { ...w, sessions: patch(w.sessions) } : w)),
    }));

  const updateSession = (si: number, patch: (s: ProgramSession) => ProgramSession) =>
    updateWeek((list) => list.map((s, i) => (i === si ? patch(s) : s)));

  const updateExercise = (si: number, id: string, patch: (e: ProgramExercise) => ProgramExercise) =>
    updateSession(si, (s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === id ? patch(e) : e)),
    }));

  const addWeek = () =>
    setProgram((p) => {
      const source = p.weeks[wi];
      setWi(p.weeks.length);
      return { weeks: [...p.weeks, source ? cloneWeek(source) : p.weeks[0]] };
    });

  const removeWeek = () =>
    setProgram((p) => {
      if (p.weeks.length <= 1) return p;
      setWi(Math.max(0, wi - 1));
      return { weeks: p.weeks.filter((_, i) => i !== wi) };
    });

  const setSeries = (si: number, id: string, field: 'reps' | 'loads', k: number, value: string) =>
    updateExercise(si, id, (e) => {
      const next = [...e[field]];
      while (next.length <= k) next.push('');
      next[k] = value;
      return { ...e, [field]: next };
    });

  /** Bascule reps ET charges entre « commun à toutes les séries » et « une valeur par série ». */
  const togglePerSet = (si: number, id: string) =>
    updateExercise(si, id, (e) => {
      const flip = (arr: string[]) =>
        arr.length > 1
          ? [arr.find(Boolean) ?? '']
          : Array.from({ length: e.sets }, () => arr[0] ?? '');
      return { ...e, reps: flip(e.reps), loads: flip(e.loads) };
    });

  const setSets = (si: number, id: string, sets: number) => {
    const fit = (a: string[]) =>
      a.length > 1 ? Array.from({ length: sets }, (_, k) => a[k] ?? '') : a;
    updateExercise(si, id, (e) => ({ ...e, sets, reps: fit(e.reps), loads: fit(e.loads) }));
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
    else Alert.alert(title, message);
  };

  const onExport = () => {
    if (!canUseFiles) return router.push('/transfer');
    downloadCsv(programToCsv(program, progress, done));
  };

  const onImportFile = async () => {
    if (!canUseFiles) return router.push('/transfer');
    const content = await pickCsv();
    if (!content) return;
    try {
      const parsed = csvToProgram(content);
      importProgram(parsed.program, parsed.progress, parsed.done);
      const fresh = useProgramStore.getState().program;
      if (fresh) {
        setProgram(fresh);
        setWi(0);
      }
      const exos = parsed.program.weeks[0]?.sessions.reduce((n, s) => n + s.exercises.length, 0) ?? 0;
      notify('Prog importée', `${parsed.program.weeks.length} semaine(s), ${exos} exo(s) en S1.`);
    } catch (e) {
      notify('Import impossible', e instanceof Error ? e.message : String(e));
    }
  };

  const onSave = () => {
    const cleaned: Program = {
      weeks: program.weeks.map((w) => ({
        ...w,
        sessions: w.sessions.map((s) => ({
          ...s,
          title: s.title.trim() || 'Séance',
          exercises: s.exercises
            .filter((e) => e.name.trim())
            .map((e) => ({
              ...e,
              name: e.name.trim(),
              sets: Math.max(1, e.sets || 1),
              reps: trimSeries(e.reps),
              loads: trimSeries(e.loads),
            })),
        })),
      })),
    };
    const total = cleaned.weeks.reduce(
      (n, w) => n + w.sessions.reduce((m, s) => m + s.exercises.length, 0),
      0,
    );
    if (total === 0) {
      notify('Prog vide', 'Ajoute au moins un exo avec un nom.');
      return;
    }
    saveProgram(cleaned);
    goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerBtns}>
              <Pressable
                hitSlop={10}
                onPress={onImportFile}
                accessibilityLabel="Importer un fichier CSV"
                style={styles.headerBtn}
              >
                <DownloadIcon direction="down" />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={onExport}
                accessibilityLabel="Exporter ma prog en CSV"
                style={styles.headerBtn}
              >
                <DownloadIcon direction="up" />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.weekTabs}>
          {program.weeks.map((w, i) => (
            <Pressable
              key={w.id}
              onPress={() => setWi(i)}
              style={[styles.weekTab, i === wi && styles.weekTabOn]}
            >
              <Text style={[styles.weekTabText, i === wi && styles.weekTabTextOn]}>S{i + 1}</Text>
            </Pressable>
          ))}
          {program.weeks.length > 1 && (
            <Pressable onPress={removeWeek} hitSlop={6} style={styles.weekTabGhost}>
              <Text style={styles.weekTabGhostText}>−</Text>
            </Pressable>
          )}
          <Pressable onPress={addWeek} hitSlop={6} style={styles.weekTabGhost}>
            <Text style={styles.weekTabGhostText}>+</Text>
          </Pressable>
        </View>

        {sessions.map((session, si) => {
          const isCollapsed = collapsed.has(session.id);
          const filled = session.exercises.filter((e) => e.name.trim()).length;
          return (
            <View key={session.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <TextInput
                  value={session.title}
                  onChangeText={(title) => updateSession(si, (s) => ({ ...s, title }))}
                  style={styles.cardTitle}
                />
                <Pressable
                  onPress={() => toggleCollapsed(session.id)}
                  hitSlop={10}
                  accessibilityLabel={isCollapsed ? 'Déplier' : 'Replier'}
                  style={styles.cardToggle}
                >
                  <Text style={styles.cardCount}>
                    {filled} exo{filled > 1 ? 's' : ''}
                  </Text>
                  <Text style={[styles.chevron, !isCollapsed && styles.chevronOpen]}>›</Text>
                </Pressable>
              </View>

              {!isCollapsed && (
                <>
                  {session.exercises.map((exercise, ei) => {
                    const perSet = exercise.reps.length > 1 || exercise.loads.length > 1;
                    return (
                      <View key={exercise.id} style={styles.exercise}>
                        <View style={styles.exerciseHeader}>
                          <Text style={styles.exerciseIndex}>Exo {ei + 1}</Text>
                          <IconBtn
                            label="Monter"
                            glyph="↑"
                            disabled={ei === 0}
                            onPress={() =>
                              updateSession(si, (s) => ({
                                ...s,
                                exercises: move(s.exercises, ei, -1),
                              }))
                            }
                          />
                          <IconBtn
                            label="Descendre"
                            glyph="↓"
                            disabled={ei === session.exercises.length - 1}
                            onPress={() =>
                              updateSession(si, (s) => ({
                                ...s,
                                exercises: move(s.exercises, ei, 1),
                              }))
                            }
                          />
                          <IconBtn
                            label="Dupliquer"
                            glyph="⧉"
                            onPress={() =>
                              updateSession(si, (s) => ({
                                ...s,
                                exercises: [
                                  ...s.exercises.slice(0, ei + 1),
                                  cloneExercise(exercise),
                                  ...s.exercises.slice(ei + 1),
                                ],
                              }))
                            }
                          />
                          <IconBtn
                            label="Retirer"
                            glyph="✕"
                            disabled={session.exercises.length <= 1}
                            onPress={() =>
                              updateSession(si, (s) => ({
                                ...s,
                                exercises: s.exercises.filter((e) => e.id !== exercise.id),
                              }))
                            }
                          />
                        </View>

                        <TextInput
                          value={exercise.name}
                          onChangeText={(name) => updateExercise(si, exercise.id, (e) => ({ ...e, name }))}
                          style={styles.nameInput}
                        />

                        <View style={styles.stepperRow}>
                          <Text style={styles.fieldTag}>Séries</Text>
                          <View style={styles.stepper}>
                            <Pressable
                              hitSlop={8}
                              disabled={exercise.sets <= 1}
                              onPress={() => setSets(si, exercise.id, exercise.sets - 1)}
                              style={[styles.stepBtn, exercise.sets <= 1 && styles.off]}
                            >
                              <Text style={styles.stepBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepValue}>{exercise.sets}</Text>
                            <Pressable
                              hitSlop={8}
                              disabled={exercise.sets >= 20}
                              onPress={() => setSets(si, exercise.id, exercise.sets + 1)}
                              style={[styles.stepBtn, exercise.sets >= 20 && styles.off]}
                            >
                              <Text style={styles.stepBtnText}>+</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.weekCell}>
                          {perSet ? (
                            <View style={styles.table}>
                              <View style={styles.tableHead}>
                                <Text style={[styles.th, styles.thNum]}>Série</Text>
                                <Text style={styles.th}>Reps</Text>
                                <Text style={styles.th}>Charge</Text>
                              </View>
                              {Array.from({ length: exercise.sets }, (_, k) => (
                                <View key={k} style={styles.tr}>
                                  <Text style={styles.tdNum}>{k + 1}</Text>
                                  <TextInput
                                    value={exercise.reps[k] ?? ''}
                                    onChangeText={(v) => setSeries(si, exercise.id, 'reps', k, v)}
                                    style={styles.td}
                                  />
                                  <TextInput
                                    value={exercise.loads[k] ?? ''}
                                    onChangeText={(v) => setSeries(si, exercise.id, 'loads', k, v)}
                                    style={styles.td}
                                  />
                                </View>
                              ))}
                            </View>
                          ) : (
                            <View style={styles.weekRow}>
                              <Text style={styles.fieldTag}>Reps</Text>
                              <TextInput
                                value={exercise.reps[0] ?? ''}
                                onChangeText={(v) => setSeries(si, exercise.id, 'reps', 0, v)}
                                style={styles.smallInput}
                              />
                              <Text style={styles.fieldTag}>Charge</Text>
                              <TextInput
                                value={exercise.loads[0] ?? ''}
                                onChangeText={(v) => setSeries(si, exercise.id, 'loads', 0, v)}
                                style={styles.smallInput}
                              />
                            </View>
                          )}

                          <Pressable
                            onPress={() => togglePerSet(si, exercise.id)}
                            hitSlop={8}
                            style={styles.detailLink}
                          >
                            <Text style={styles.detailLinkText}>
                              {perSet ? '↥ Même valeur partout' : '↧ Détailler série par série'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  <Pressable
                    onPress={() =>
                      updateSession(si, (s) => ({ ...s, exercises: [...s.exercises, newExercise()] }))
                    }
                    style={({ pressed }) => [styles.addExercise, pressed && styles.pressed]}
                  >
                    <Text style={styles.addExerciseText}>+ Ajouter un exo</Text>
                  </Pressable>

                  <View style={styles.sessionActions}>
                    <IconBtn
                      label="Monter la séance"
                      glyph="↑"
                      disabled={si === 0}
                      onPress={() => updateWeek((list) => move(list, si, -1))}
                    />
                    <IconBtn
                      label="Descendre la séance"
                      glyph="↓"
                      disabled={si === sessions.length - 1}
                      onPress={() => updateWeek((list) => move(list, si, 1))}
                    />
                    <IconBtn
                      label="Dupliquer la séance"
                      glyph="⧉"
                      onPress={() =>
                        updateWeek((list) => [
                          ...list.slice(0, si + 1),
                          cloneSession(session),
                          ...list.slice(si + 1),
                        ])
                      }
                    />
                    {sessions.length > 1 && (
                      <Pressable
                        onPress={() => updateWeek((list) => list.filter((_, i) => i !== si))}
                        hitSlop={8}
                        style={styles.removeSession}
                      >
                        <Text style={styles.remove}>Retirer la séance</Text>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })}

        <Button
          title="+ Ajouter une séance"
          variant="ghost"
          onPress={() => updateWeek((list) => [...list, newSession(list.length)])}
        />

        <Pressable onPress={() => router.push('/transfer')} hitSlop={8} style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Sauvegarde & import</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button title="Valider ma prog" onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

function IconBtn({
  glyph,
  label,
  onPress,
  disabled,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.iconBtn, disabled && styles.off]}
    >
      <Text style={styles.iconBtnText}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtns: { flexDirection: 'row', gap: spacing.md, marginRight: spacing.md },
  headerBtn: { paddingVertical: spacing.xs },
  textLink: { alignItems: 'center', paddingVertical: spacing.xs },
  textLinkLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  weekTabs: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  weekTab: {
    minWidth: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  weekTabOn: { backgroundColor: colors.pinkDeep, borderColor: colors.pinkDeep },
  weekTabText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textMuted },
  weekTabTextOn: { color: colors.white },
  weekTabGhost: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  weekTabGhostText: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.pinkDeep },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
    padding: 0,
    letterSpacing: -0.5,
  },
  cardToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 24,
    color: colors.textLight,
    paddingHorizontal: spacing.xs,
  },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  exercise: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  exerciseIndex: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.pinkDeep },
  off: { opacity: 0.3 },

  nameInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
  },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.pinkDeep },
  stepValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    minWidth: 32,
    textAlign: 'center',
  },

  weekCell: { width: '100%', backgroundColor: colors.background, borderRadius: radii.md, paddingHorizontal: spacing.sm + 4 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  fieldTag: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  smallInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  table: { width: '100%', paddingTop: spacing.xs },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs },
  th: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  thNum: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: 38 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tdNum: { width: 38, flexShrink: 0, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.pinkDeep },
  td: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 3,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  detailLink: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  detailLinkText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },

  addExercise: {
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.pink,
  },
  addExerciseText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.pinkDeep },
  pressed: { opacity: 0.7 },
  sessionActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  removeSession: { marginLeft: 'auto', paddingVertical: spacing.xs },
  remove: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },

  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
