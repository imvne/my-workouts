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
  newExercise,
  newProgram,
  newSession,
  normalizeProgram,
  useProgramStore,
} from '@/store/programStore';
import type { Program, ProgramExercise, ProgramSession } from '@/types/program';

function resizeWeeks(program: Program, weeks: number): Program {
  return {
    weeks,
    sessions: program.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        weeks: Array.from({ length: weeks }, (_, i) => e.weeks[i] ?? ''),
        loads: Array.from({ length: weeks }, (_, i) => e.loads[i] ?? []),
      })),
    })),
  };
}

export default function EditProgram() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Ouvert directement par URL (PWA) : pas d'historique, on revient au tunnel.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const saved = useProgramStore((s) => s.program);
  const saveProgram = useProgramStore((s) => s.saveProgram);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const importProgram = useProgramStore((s) => s.importProgram);

  const [program, setProgram] = useState<Program>(() =>
    saved ? normalizeProgram(saved) : newProgram(),
  );
  const [week, setWeek] = useState(1); // semaine en cours d'édition (1-based)
  // Séances déjà remplies : repliées au départ, on les ouvre si besoin.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () =>
      new Set(
        program.sessions.filter((x) => x.exercises.some((e) => e.name.trim())).map((x) => x.id),
      ),
  );
  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addWeek = () =>
    setProgram((p) => {
      const n = Math.min(12, p.weeks + 1);
      setWeek(n);
      return resizeWeeks(p, n);
    });

  const removeWeek = () =>
    setProgram((p) => {
      const n = Math.max(1, p.weeks - 1);
      setWeek((w) => Math.min(w, n));
      return resizeWeeks(p, n);
    });
  const addSession = () =>
    setProgram((p) => ({ ...p, sessions: [...p.sessions, newSession(p.weeks, p.sessions.length)] }));
  const removeSession = (id: string) =>
    setProgram((p) => ({ ...p, sessions: p.sessions.filter((x) => x.id !== id) }));

  const updateSession = (index: number, patch: (s: ProgramSession) => ProgramSession) =>
    setProgram((p) => ({
      ...p,
      sessions: p.sessions.map((s, i) => (i === index ? patch(s) : s)),
    }));

  const updateExercise = (
    sessionIndex: number,
    exerciseId: string,
    patch: (e: ProgramExercise) => ProgramExercise,
  ) =>
    updateSession(sessionIndex, (s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === exerciseId ? patch(e) : e)),
    }));

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
      // L'éditeur garde sa copie locale : on la remplace pour ne pas réécrire l'ancienne prog.
      const fresh = normalizeProgram(parsed.program);
      setProgram(fresh);
      setWeek(1);
      const exos = fresh.sessions.reduce((n, x) => n + x.exercises.length, 0);
      const first = fresh.sessions[0]?.exercises[0]?.name ?? '';
      const msg = `${fresh.sessions.length} séance(s), ${exos} exo(s). Premier exo : ${first}`;
      if (Platform.OS === 'web') window.alert(`Prog importée\n${msg}`);
      else Alert.alert('Prog importée', msg);
      router.dismissTo('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') window.alert(`Import impossible\n${msg}`);
      else Alert.alert('Import impossible', msg);
    }
  };

  const setLoad = (si: number, id: string, wi: number, k: number, value: string) =>
    updateExercise(si, id, (e) => {
      const loads = e.loads.map((a) => [...a]);
      while (loads.length <= wi) loads.push([]);
      while (loads[wi].length <= k) loads[wi].push('');
      loads[wi][k] = value;
      return { ...e, loads };
    });

  const togglePerSet = (si: number, id: string, wi: number) =>
    updateExercise(si, id, (e) => {
      const loads = e.loads.map((a) => [...a]);
      while (loads.length <= wi) loads.push([]);
      const cur = loads[wi];
      loads[wi] =
        cur.length > 1
          ? [cur.find(Boolean) ?? ''] // retour à une charge commune
          : Array.from({ length: e.sets }, () => cur[0] ?? ''); // une charge par série
      return { ...e, loads };
    });

  const setSets = (si: number, id: string, sets: number) =>
    updateExercise(si, id, (e) => ({
      ...e,
      sets,
      loads: e.loads.map((a) => (a.length > 1 ? Array.from({ length: sets }, (_, k) => a[k] ?? '') : a)),
    }));

  const onSave = () => {
    const cleaned: Program = {
      ...program,
      sessions: program.sessions.map((s) => ({
        ...s,
        title: s.title.trim(),
        exercises: s.exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            ...e,
            name: e.name.trim(),
            sets: Math.max(1, e.sets || 1),
            weeks: e.weeks.map((w) => w.trim()),
            loads: e.loads.map((a) => {
              const trimmed = a.map((v) => v.trim());
              return trimmed.some(Boolean) ? trimmed : [];
            }),
          })),
      })),
    };
    const total = cleaned.sessions.reduce((n, s) => n + s.exercises.length, 0);
    if (total === 0) {
      const msg = 'Ajoute au moins un exo avec un nom.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Prog vide', msg);
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
              {/* ⤓ = faire entrer un CSV dans l'app, ⤒ = sortir / partager ma prog */}
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
                accessibilityLabel="Partager ma prog en CSV"
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
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => (
            <Pressable
              key={w}
              onPress={() => setWeek(w)}
              style={[styles.weekTab, w === week && styles.weekTabOn]}
            >
              <Text style={[styles.weekTabText, w === week && styles.weekTabTextOn]}>S{w}</Text>
            </Pressable>
          ))}
          {program.weeks > 1 && (
            <Pressable onPress={removeWeek} hitSlop={6} style={styles.weekTabGhost}>
              <Text style={styles.weekTabGhostText}>−</Text>
            </Pressable>
          )}
          {program.weeks < 12 && (
            <Pressable onPress={addWeek} hitSlop={6} style={styles.weekTabGhost}>
              <Text style={styles.weekTabGhostText}>+</Text>
            </Pressable>
          )}
        </View>

        {program.sessions.map((session, si) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <TextInput
                value={session.title}
                onChangeText={(title) => updateSession(si, (s) => ({ ...s, title }))}
                placeholder={`Séance ${si + 1}`}
                placeholderTextColor={colors.textLight}
                style={styles.cardTitle}
              />
              <Pressable
                onPress={() => toggleCollapsed(session.id)}
                hitSlop={10}
                accessibilityLabel={collapsed.has(session.id) ? 'Déplier' : 'Replier'}
                style={styles.cardToggle}
              >
                <Text style={styles.cardCount}>
                  {session.exercises.filter((e) => e.name.trim()).length} exo
                  {session.exercises.filter((e) => e.name.trim()).length > 1 ? 's' : ''}
                </Text>
                <Text style={[styles.chevron, !collapsed.has(session.id) && styles.chevronOpen]}>
                  ›
                </Text>
              </Pressable>
            </View>

            {collapsed.has(session.id) ? null : session.exercises.map((exercise, ei) => (
              <View key={exercise.id} style={styles.exercise}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseIndex}>Exo {ei + 1}</Text>
                  {session.exercises.length > 1 && (
                    <Pressable
                      hitSlop={10}
                      onPress={() =>
                        updateSession(si, (s) => ({
                          ...s,
                          exercises: s.exercises.filter((e) => e.id !== exercise.id),
                        }))
                      }
                    >
                      <Text style={styles.remove}>Retirer</Text>
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={exercise.name}
                  onChangeText={(name) => updateExercise(si, exercise.id, (e) => ({ ...e, name }))}
                  style={styles.nameInput}
                />
                <SetsStepper
                  value={exercise.sets}
                  onChange={(sets) => setSets(si, exercise.id, sets)}
                />
                <View style={styles.weekCell}>
                  <View style={styles.weekRow}>
                    <TextInput
                      value={exercise.weeks[week - 1] ?? ''}
                      onChangeText={(value) =>
                        updateExercise(si, exercise.id, (e) => ({
                          ...e,
                          weeks: e.weeks.map((w, i) => (i === week - 1 ? value : w)),
                        }))
                      }
                      style={styles.weekInput}
                    />
                    {(exercise.loads[week - 1]?.length ?? 0) <= 1 && (
                      <TextInput
                        value={exercise.loads[week - 1]?.[0] ?? ''}
                        onChangeText={(value) => setLoad(si, exercise.id, week - 1, 0, value)}
                        style={styles.loadInput}
                      />
                    )}
                    <Pressable
                      hitSlop={8}
                      onPress={() => togglePerSet(si, exercise.id, week - 1)}
                      accessibilityLabel={
                        (exercise.loads[week - 1]?.length ?? 0) > 1
                          ? 'Même charge pour toutes les séries'
                          : 'Charge par série'
                      }
                      style={[
                        styles.perSetBtn,
                        (exercise.loads[week - 1]?.length ?? 0) > 1 && styles.perSetBtnOn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.perSetText,
                          (exercise.loads[week - 1]?.length ?? 0) > 1 && styles.perSetTextOn,
                        ]}
                      >
                        {(exercise.loads[week - 1]?.length ?? 0) > 1 ? '≠' : '='}
                      </Text>
                    </Pressable>
                  </View>

                  {(exercise.loads[week - 1]?.length ?? 0) > 1 && (
                    <View style={styles.loadGrid}>
                      {Array.from({ length: exercise.sets }, (_, k) => (
                        <View key={k} style={styles.loadCell}>
                          <Text style={styles.loadCellLabel}>{k + 1}</Text>
                          <TextInput
                            value={exercise.loads[week - 1]?.[k] ?? ''}
                            onChangeText={(value) => setLoad(si, exercise.id, week - 1, k, value)}
                            style={styles.loadCellInput}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {!collapsed.has(session.id) && (
              <>
                <Pressable
                  onPress={() =>
                    updateSession(si, (s) => ({
                      ...s,
                      exercises: [...s.exercises, newExercise(program.weeks)],
                    }))
                  }
                  style={({ pressed }) => [styles.addExercise, pressed && styles.pressed]}
                >
                  <Text style={styles.addExerciseText}>+ Ajouter un exo</Text>
                </Pressable>
                {program.sessions.length > 1 && (
                  <Pressable
                    onPress={() => removeSession(session.id)}
                    hitSlop={8}
                    style={styles.removeSession}
                  >
                    <Text style={styles.remove}>Retirer la séance</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        ))}

        <Button title="+ Ajouter une séance" variant="ghost" onPress={addSession} />

        <Pressable onPress={() => router.push('/transfer')} hitSlop={8} style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Copier / coller en texte</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button title="Valider ma prog" onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}

function SetsStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>Séries</Text>
      <View style={styles.stepper}>
        <Pressable
          hitSlop={8}
          disabled={value <= 1}
          onPress={() => onChange(value - 1)}
          style={[styles.stepBtn, value <= 1 && styles.stepBtnOff]}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable
          hitSlop={8}
          disabled={value >= 12}
          onPress={() => onChange(value + 1)}
          style={[styles.stepBtn, value >= 12 && styles.stepBtnOff]}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerBtns: { flexDirection: 'row', gap: spacing.md, marginRight: spacing.md },
  headerBtn: { paddingVertical: spacing.xs },
  textLink: { alignItems: 'center', paddingVertical: spacing.xs },
  textLinkLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  weekTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
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
  weekTabGhost: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTabGhostText: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.pinkDeep },
  numberField: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  numberLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  numberInput: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.pinkDeep,
    padding: 0,
  },
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
  removeSession: { alignItems: 'center', paddingVertical: spacing.xs },
  exercise: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseIndex: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  remove: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.pinkDeep,
  },
  nameInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xs,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.3 },
  stepBtnText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.pinkDeep },
  stepValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  weeksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekCell: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 4,
  },
  weekCellFirst: {
    borderWidth: 1,
    borderColor: colors.pinkSoft,
  },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  loadInput: {
    width: 76,
    flexShrink: 0,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  perSetBtn: {
    flexShrink: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  perSetBtnOn: { backgroundColor: colors.pinkDeep },
  perSetText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.pinkDeep },
  perSetTextOn: { color: colors.white },
  loadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingLeft: 22 + spacing.sm,
  },
  loadCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs + 2,
  },
  loadCellLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textLight },
  loadCellInput: {
    width: 52,
    paddingVertical: spacing.xs + 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  weekLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.pinkDeep,
    width: 22,
  },
  weekInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  addExercise: {
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.pink,
  },
  addExerciseText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.pinkDeep,
  },
  pressed: { opacity: 0.7 },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
