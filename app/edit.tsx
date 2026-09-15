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

function clampInt(text: string, min: number, max: number): number | null {
  const n = parseInt(text, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function resizeWeeks(program: Program, weeks: number): Program {
  return {
    weeks,
    sessions: program.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        weeks: Array.from({ length: weeks }, (_, i) => e.weeks[i] ?? ''),
      })),
    })),
  };
}

function resizeSessions(program: Program, count: number): Program {
  const sessions = program.sessions.slice(0, count);
  while (sessions.length < count) sessions.push(newSession(program.weeks, sessions.length));
  return { ...program, sessions };
}

export default function EditProgram() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useProgramStore((s) => s.program);
  const saveProgram = useProgramStore((s) => s.saveProgram);
  const progress = useProgramStore((s) => s.progress);
  const importProgram = useProgramStore((s) => s.importProgram);

  const [program, setProgram] = useState<Program>(() =>
    saved ? normalizeProgram(saved) : newProgram(),
  );
  const [weeksText, setWeeksText] = useState(String(program.weeks));
  const [sessionsText, setSessionsText] = useState(String(program.sessions.length));

  const onWeeksBlur = () => {
    const n = clampInt(weeksText, 1, 12) ?? program.weeks;
    setWeeksText(String(n));
    setProgram((p) => resizeWeeks(p, n));
  };
  const onSessionsBlur = () => {
    const n = clampInt(sessionsText, 1, 7) ?? program.sessions.length;
    setSessionsText(String(n));
    setProgram((p) => resizeSessions(p, n));
  };

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
    downloadCsv(programToCsv(program, progress));
  };

  const onImportFile = async () => {
    if (!canUseFiles) return router.push('/transfer');
    const content = await pickCsv();
    if (!content) return;
    try {
      const parsed = csvToProgram(content);
      importProgram(parsed.program, parsed.progress);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (Platform.OS === 'web') window.alert(`Import impossible\n${msg}`);
      else Alert.alert('Import impossible', msg);
    }
  };

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
    router.back();
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
                <DownloadIcon direction="up" />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={onExport}
                accessibilityLabel="Télécharger ma prog en CSV"
                style={styles.headerBtn}
              >
                <DownloadIcon />
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
        <View style={styles.row}>
          <NumberField
            label="Semaines"
            value={weeksText}
            onChangeText={setWeeksText}
            onBlur={onWeeksBlur}
          />
          <NumberField
            label="Séances"
            value={sessionsText}
            onChangeText={setSessionsText}
            onBlur={onSessionsBlur}
          />
        </View>

        {program.sessions.map((session, si) => (
          <View key={session.id} style={styles.card}>
            <TextInput
              value={session.title}
              onChangeText={(title) => updateSession(si, (s) => ({ ...s, title }))}
              placeholder={`Séance ${si + 1}`}
              placeholderTextColor={colors.textLight}
              style={styles.cardTitle}
            />

            {session.exercises.map((exercise, ei) => (
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
                  placeholder="Nom de l’exo (ex. Squat)"
                  placeholderTextColor={colors.textLight}
                  style={styles.nameInput}
                />
                <SetsStepper
                  value={exercise.sets}
                  onChange={(sets) => updateExercise(si, exercise.id, (e) => ({ ...e, sets }))}
                />
                <View style={styles.weeksGrid}>
                  {exercise.weeks.map((text, wi) => (
                    <View key={wi} style={[styles.weekCell, wi === 0 && styles.weekCellFirst]}>
                      <Text style={styles.weekLabel}>S{wi + 1}</Text>
                      <TextInput
                        value={text}
                        onChangeText={(value) =>
                          updateExercise(si, exercise.id, (e) => ({
                            ...e,
                            weeks: e.weeks.map((w, i) => (i === wi ? value : w)),
                          }))
                        }
                        placeholder={wi === 0 ? 'Difficulté semaine 1 (ex. 4×8 @ 60 kg)' : '—'}
                        placeholderTextColor={colors.textLight}
                        style={styles.weekInput}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

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
          </View>
        ))}

        <Text style={styles.hint}>
          Seule la semaine 1 est nécessaire : si une semaine est vide, la dernière consigne
          renseignée est reprise.
        </Text>
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

function NumberField({
  label,
  value,
  onChangeText,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onSubmitEditing={onBlur}
        keyboardType="number-pad"
        inputMode="numeric"
        selectTextOnFocus
        style={styles.numberInput}
      />
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
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
    padding: 0,
    letterSpacing: -0.5,
  },
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
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 4,
  },
  weekCellFirst: {
    flexBasis: '100%',
    borderWidth: 1,
    borderColor: colors.pinkSoft,
  },
  weekLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.pinkDeep,
    width: 22,
  },
  weekInput: {
    flex: 1,
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
