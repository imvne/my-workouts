import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DownloadIcon } from '@/components/ui/DownloadIcon';
import { DragList, Grip } from '@/components/ui/DragList';
import { FormatPicker, FormatTag } from '@/components/ui/FormatPicker';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { canUseFiles, downloadCsv, pickCsv } from '@/lib/csvFile';
import { formatOf, suggest } from '@/lib/formats';
import { csvToProgram, programToCsv } from '@/lib/programCsv';
import {
  cloneExercise,
  cloneSession,
  cloneWeek,
  newExercise,
  newProgram,
  newSession,
  seriesToText,
  textToSeries,
  useProgramStore,
} from '@/store/programStore';
import type { Program, ProgramExercise, ProgramSession, ProgramWeek } from '@/types/program';

// --- transformations pures (chaque modif est sauvegardée tout de suite) ---

function moveTo<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const insertAfter = <T,>(list: T[], index: number, item: T) => [
  ...list.slice(0, index + 1),
  item,
  ...list.slice(index + 1),
];

const mapWeek = (p: Program, wi: number, fn: (w: ProgramWeek) => ProgramWeek): Program => ({
  weeks: p.weeks.map((w, i) => (i === wi ? fn(w) : w)),
});

const mapSessions = (p: Program, wi: number, fn: (s: ProgramSession[]) => ProgramSession[]) =>
  mapWeek(p, wi, (w) => ({ ...w, sessions: fn(w.sessions) }));

const mapSession = (p: Program, wi: number, si: number, fn: (s: ProgramSession) => ProgramSession) =>
  mapSessions(p, wi, (list) => list.map((s, i) => (i === si ? fn(s) : s)));

const mapExercises = (
  p: Program,
  wi: number,
  si: number,
  fn: (e: ProgramExercise[]) => ProgramExercise[],
) => mapSession(p, wi, si, (s) => ({ ...s, exercises: fn(s.exercises) }));

const mapExercise = (
  p: Program,
  wi: number,
  si: number,
  id: string,
  fn: (e: ProgramExercise) => ProgramExercise,
) => mapExercises(p, wi, si, (list) => list.map((e) => (e.id === id ? fn(e) : e)));

const titleKey = (t: string) => t.trim().toLowerCase();
const fmtKeyOf = (id: string) => `f:${id}`;

export default function EditProgram() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const program = useProgramStore((s) => s.program);
  const saveProgram = useProgramStore((s) => s.saveProgram);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const importProgram = useProgramStore((s) => s.importProgram);
  const library = useProgramStore((s) => s.library);
  const [nameFocus, setNameFocus] = useState<string | null>(null); // exo dont on tape le nom
  // Ordi : une ligne de tableur par exo (+ navigation à gauche si assez large).
  // Téléphone : nom au-dessus, chiffres dessous.
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const withSidebar = width >= 900;

  const [weekSel, setWeekSel] = useState<number[]>([]); // semaines affichées ; vide = toutes
  const [titleFilter, setTitleFilter] = useState<string | null>(null);
  const [sessionFilter, setSessionFilter] = useState<string | null>(null); // id de séance
  const [menu, setMenu] = useState<string | null>(null);
  const [folded, setFolded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!program) saveProgram(newProgram());
  }, [program, saveProgram]);

  const titles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const w of program?.weeks ?? [])
      for (const s of w.sessions) if (!seen.has(titleKey(s.title))) seen.set(titleKey(s.title), s.title);
    return [...seen.entries()];
  }, [program]);

  if (!program) return null;

  const commit = (fn: (p: Program) => Program) => {
    const latest = useProgramStore.getState().program ?? program;
    saveProgram(fn(latest));
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
      showAll();
    } catch (e) {
      notify('Import impossible', e instanceof Error ? e.message : String(e));
    }
  };

  const showAll = () => {
    setWeekSel([]);
    setTitleFilter(null);
    setSessionFilter(null);
  };

  const toggleWeek = (wi: number) => {
    setSessionFilter(null);
    setWeekSel((sel) => (sel.includes(wi) ? sel.filter((x) => x !== wi) : [...sel, wi].sort((a, b) => a - b)));
  };

  const addWeek = () => {
    const source = program.weeks[weekSel.length ? weekSel[weekSel.length - 1] : program.weeks.length - 1];
    commit((p) => ({ weeks: [...p.weeks, cloneWeek(source)] }));
    if (weekSel.length) setWeekSel((sel) => [...sel, program.weeks.length]);
  };

  const toggleFold = (key: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const visibleWeeks = program.weeks
    .map((w, wi) => ({ w, wi }))
    .filter(({ wi }) => weekSel.length === 0 || weekSel.includes(wi));

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <View style={styles.headerBtns}>
            <Pressable hitSlop={10} onPress={onImportFile} accessibilityLabel="Importer un CSV">
              <DownloadIcon direction="down" />
            </Pressable>
            <Pressable hitSlop={10} onPress={onExport} accessibilityLabel="Exporter en CSV">
              <DownloadIcon direction="up" />
            </Pressable>
          </View>
        ),
      }}
    />
  );

  const weekChips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Chip label="Tout" active={weekSel.length === 0} onPress={() => setWeekSel([])} />
      {program.weeks.map((w, i) => (
        <Chip key={w.id} label={`S${i + 1}`} active={weekSel.includes(i)} onPress={() => toggleWeek(i)} />
      ))}
      <Chip label="+" ghost onPress={addWeek} />
    </ScrollView>
  );

  const weeksBody = (
    <>
        {visibleWeeks.map(({ w, wi }) => {
          const weekKey = `w:${w.id}`;
          const weekFolded = folded.has(weekKey);
          const sessions = w.sessions
            .map((s, si) => ({ s, si }))
            .filter(
              ({ s }) =>
                (titleFilter === null || titleKey(s.title) === titleFilter) &&
                (sessionFilter === null || s.id === sessionFilter),
            );

          return (
            <View key={w.id}>
              <View style={styles.weekHeader}>
                <Pressable onPress={() => toggleFold(weekKey)} style={styles.weekTitleBtn} hitSlop={6}>
                  <Text style={[styles.fold, !weekFolded && styles.foldOpen]}>›</Text>
                  <Text style={styles.weekTitle}>Semaine {wi + 1}</Text>
                </Pressable>
                <MenuBtn open={menu === weekKey} onPress={() => setMenu(menu === weekKey ? null : weekKey)} />
              </View>
              {menu === weekKey && (
                <Actions
                  items={[
                    {
                      label: 'Dupliquer',
                      onPress: () => commit((p) => ({ weeks: insertAfter(p.weeks, wi, cloneWeek(w)) })),
                    },
                    {
                      label: 'Supprimer',
                      danger: true,
                      disabled: program.weeks.length <= 1,
                      onPress: () => {
                        commit((p) => ({ weeks: p.weeks.filter((_, i) => i !== wi) }));
                        showAll();
                      },
                    },
                  ]}
                  onDone={() => setMenu(null)}
                />
              )}

              {!weekFolded && (
                <DragList
                  items={sessions}
                  keyOf={(x) => x.s.id}
                  enabled={titleFilter === null && sessionFilter === null}
                  onMove={(from, to) => commit((p) => mapSessions(p, wi, (l) => moveTo(l, from, to)))}
                  renderItem={({ s, si }, _i, sessionHandle) => {
                  const sessionKey = `s:${s.id}`;
                  const sessionFolded = folded.has(sessionKey);
                  return (
                    <View key={s.id} style={styles.session}>
                      <View style={styles.sessionHeader}>
                        <Grip handlers={sessionHandle} />
                        <Pressable onPress={() => toggleFold(sessionKey)} hitSlop={8}>
                          <Text style={[styles.fold, !sessionFolded && styles.foldOpen]}>›</Text>
                        </Pressable>
                        <TextInput
                          value={s.title}
                          onChangeText={(title) => commit((p) => mapSession(p, wi, si, (x) => ({ ...x, title })))}
                          style={styles.sessionTitle}
                        />
                        <Text style={styles.count}>{s.exercises.filter((e) => e.name.trim()).length}</Text>
                        <MenuBtn
                          open={menu === sessionKey}
                          onPress={() => setMenu(menu === sessionKey ? null : sessionKey)}
                        />
                      </View>
                      {menu === sessionKey && (
                        <Actions
                          items={[
                            {
                              label: 'Dupliquer',
                              onPress: () =>
                                commit((p) => mapSessions(p, wi, (l) => insertAfter(l, si, cloneSession(s)))),
                            },
                            {
                              label: 'Supprimer',
                              danger: true,
                              disabled: w.sessions.length <= 1,
                              onPress: () =>
                                commit((p) => mapSessions(p, wi, (l) => l.filter((_, i) => i !== si))),
                            },
                          ]}
                          onDone={() => setMenu(null)}
                        />
                      )}

                      {!sessionFolded && (
                        <>
                          <HeadRow wide={wide} />
                          <DragList
                            items={s.exercises}
                            keyOf={(e) => e.id}
                            onMove={(from, to) => commit((p) => mapExercises(p, wi, si, (l) => moveTo(l, from, to)))}
                            renderItem={(e, ei, handle) => {
                            const exKey = `e:${e.id}`;
                            return (
                              <View>
                                {(() => {
                                  const name = (
                                    <TextInput
                                      value={e.name}
                                      onChangeText={(n) =>
                                        commit((p) => mapExercise(p, wi, si, e.id, (x) => ({ ...x, name: n })))
                                      }
                                      onFocus={() => setNameFocus(e.id)}
                                      // laisse le temps au clic sur une suggestion d'arriver
                                      onBlur={() => setTimeout(() => setNameFocus((f) => (f === e.id ? null : f)), 400)}
                                      style={[styles.cell, styles.cExo, styles.cellName]}
                                    />
                                  );
                                  const fmtKey = `f:${e.id}`;
                                  const format = (
                                    <Pressable
                                      onPress={() => setMenu(menu === fmtKey ? null : fmtKey)}
                                      accessibilityLabel="Format"
                                      style={[styles.cFormat, styles.formatCell]}
                                    >
                                      <FormatTag format={formatOf(e)} />
                                    </Pressable>
                                  );
                                  const numbers = (
                                    <>
                                      <SetsCell
                                        value={e.sets}
                                        onCommit={(sets) =>
                                          commit((p) => mapExercise(p, wi, si, e.id, (x) => ({ ...x, sets })))
                                        }
                                      />
                                      <TextInput
                                        value={seriesToText(e.reps)}
                                        onChangeText={(t) =>
                                          commit((p) =>
                                            mapExercise(p, wi, si, e.id, (x) => ({ ...x, reps: textToSeries(t) })),
                                          )
                                        }
                                        style={[styles.cell, styles.cReps]}
                                      />
                                      <TextInput
                                        value={seriesToText(e.loads)}
                                        onChangeText={(t) =>
                                          commit((p) =>
                                            mapExercise(p, wi, si, e.id, (x) => ({ ...x, loads: textToSeries(t) })),
                                          )
                                        }
                                        style={[styles.cell, styles.cLoad]}
                                      />
                                      <TextInput
                                        value={e.rest ?? ''}
                                        onChangeText={(rest) =>
                                          commit((p) => mapExercise(p, wi, si, e.id, (x) => ({ ...x, rest })))
                                        }
                                        style={[styles.cell, styles.cRest]}
                                      />
                                    </>
                                  );
                                  const dots = (
                                    <MenuBtn open={menu === exKey} onPress={() => setMenu(menu === exKey ? null : exKey)} />
                                  );
                                  return wide ? (
                                    <View style={styles.row}>
                                      <Grip handlers={handle} />
                                      {name}
                                      {format}
                                      {numbers}
                                      {dots}
                                    </View>
                                  ) : (
                                    <View style={styles.rowStack}>
                                      <View style={styles.rowTop}>
                                        <Grip handlers={handle} />
                                        {name}
                                        {format}
                                        {dots}
                                      </View>
                                      <View style={styles.rowBottom}>{numbers}</View>
                                    </View>
                                  );
                                })()}
                                {nameFocus === e.id &&
                                  (() => {
                                    const options = suggest(e.name, library, program);
                                    if (options.length === 0) return null;
                                    return (
                                      <View style={styles.suggestions}>
                                        {options.map((o) => (
                                          <Pressable
                                            key={o.id}
                                            onPress={() => {
                                              commit((p) =>
                                                mapExercise(p, wi, si, e.id, (x) => ({
                                                  ...x,
                                                  name: o.name,
                                                  format: o.format,
                                                })),
                                              );
                                              setNameFocus(null);
                                            }}
                                            style={styles.suggestion}
                                          >
                                            <Text numberOfLines={1} style={styles.suggestionText}>
                                              {o.name}
                                            </Text>
                                            <FormatTag format={o.format} />
                                          </Pressable>
                                        ))}
                                      </View>
                                    );
                                  })()}
                                {menu === fmtKeyOf(e.id) && (
                                  <FormatPicker
                                    value={formatOf(e)}
                                    onPick={(f) => {
                                      commit((p) => mapExercise(p, wi, si, e.id, (x) => ({ ...x, format: f })));
                                      setMenu(null);
                                    }}
                                  />
                                )}
                                {menu === exKey && (
                                  <Actions
                                    items={[
                                      {
                                        label: 'Dupliquer',
                                        onPress: () =>
                                          commit((p) =>
                                            mapExercises(p, wi, si, (l) => insertAfter(l, ei, cloneExercise(e))),
                                          ),
                                      },
                                      {
                                        label: 'Supprimer',
                                        danger: true,
                                        onPress: () =>
                                          commit((p) =>
                                            mapExercises(p, wi, si, (l) => l.filter((x) => x.id !== e.id)),
                                          ),
                                      },
                                    ]}
                                    onDone={() => setMenu(null)}
                                  />
                                )}
                              </View>
                            );
                            }}
                          />
                          <Pressable
                            onPress={() => commit((p) => mapExercises(p, wi, si, (l) => [...l, newExercise()]))}
                            style={styles.addRow}
                          >
                            <Text style={styles.addText}>+ Exercice</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  );
                  }}
                />
              )}

              {!weekFolded && titleFilter === null && sessionFilter === null && (
                <Pressable
                  onPress={() => commit((p) => mapSessions(p, wi, (l) => [...l, newSession(l.length)]))}
                  style={styles.addSession}
                >
                  <Text style={styles.addText}>+ Séance</Text>
                </Pressable>
              )}
            </View>
          );
        })}

    </>
  );

  if (withSidebar) {
    const isAll = weekSel.length === 0 && titleFilter === null && sessionFilter === null;
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.split}>
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
            <NavItem label="Tout le bloc" active={isAll} onPress={showAll} />

            <Text style={styles.navSection}>Semaines</Text>
            {program.weeks.map((w, wi) => (
              <View key={w.id}>
                <NavItem
                  label={`Semaine ${wi + 1}`}
                  active={
                    weekSel.length === 1 && weekSel[0] === wi && sessionFilter === null && titleFilter === null
                  }
                  onPress={() => {
                    setWeekSel([wi]);
                    setTitleFilter(null);
                    setSessionFilter(null);
                  }}
                />
                {w.sessions.map((s) => (
                  <NavItem
                    key={s.id}
                    label={s.title || 'Séance'}
                    sub
                    active={sessionFilter === s.id}
                    onPress={() => {
                      setWeekSel([wi]);
                      setTitleFilter(null);
                      setSessionFilter(s.id);
                    }}
                  />
                ))}
              </View>
            ))}
            <Pressable onPress={addWeek} style={styles.navAdd}>
              <Text style={styles.addText}>+ Semaine</Text>
            </Pressable>

            {titles.length > 1 && (
              <>
                <Text style={styles.navSection}>Par séance</Text>
                {titles.map(([key, label]) => (
                  <NavItem
                    key={key}
                    label={label}
                    active={titleFilter === key}
                    onPress={() => {
                      setSessionFilter(null);
                      setTitleFilter(key);
                    }}
                  />
                ))}
              </>
            )}
          </ScrollView>

          <ScrollView
            style={styles.main}
            contentContainerStyle={[styles.mainContent, { paddingBottom: insets.bottom + spacing.xxl }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.filters}>{weekChips}</View>
            {weeksBody}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.filters}>
          {weekChips}
          {titles.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="Toutes" active={titleFilter === null} onPress={() => setTitleFilter(null)} small />
              {titles.map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  active={titleFilter === key}
                  onPress={() => setTitleFilter(titleFilter === key ? null : key)}
                  small
                />
              ))}
            </ScrollView>
          )}
        </View>
        {weeksBody}
      </ScrollView>
    </View>
  );
}

function HeadRow({ wide }: { wide: boolean }) {
  return (
    <View style={[styles.headRow, !wide && styles.headRowStacked]}>
      {wide && <View style={styles.gripCol} />}
      {wide && (
        <Text numberOfLines={1} style={[styles.headCell, styles.cExo]}>
          Exercice
        </Text>
      )}
      {wide && (
        <Text numberOfLines={1} style={[styles.headCell, styles.cFormat]}>
          Format
        </Text>
      )}
      <Text numberOfLines={1} style={[styles.headCell, styles.cSets, styles.center, styles.tight]}>
        Séries
      </Text>
      <Text numberOfLines={1} style={[styles.headCell, styles.cReps]}>
        Reps
      </Text>
      <Text numberOfLines={1} style={[styles.headCell, styles.cLoad]}>
        Charge
      </Text>
      <Text numberOfLines={1} style={[styles.headCell, styles.cRest]}>
        Repos
      </Text>
      {wide && <View style={styles.cMenu} />}
    </View>
  );
}

function NavItem({
  label,
  active,
  sub,
  onPress,
}: {
  label: string;
  active: boolean;
  sub?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.navItem, sub && styles.navItemSub, active && styles.navItemOn]}>
      <Text numberOfLines={1} style={[styles.navText, sub && styles.navTextSub, active && styles.navTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  ghost,
  small,
  onPress,
}: {
  label: string;
  active?: boolean;
  ghost?: boolean;
  small?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, small && styles.chipSmall, active && styles.chipOn, ghost && styles.chipGhost]}
    >
      <Text style={[styles.chipText, small && styles.chipTextSmall, active && styles.chipTextOn, ghost && styles.chipTextGhost]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MenuBtn({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="Actions" style={[styles.cMenu, styles.menuBtn, open && styles.menuBtnOn]}>
      <Text style={[styles.menuDots, open && styles.menuDotsOn]}>⋯</Text>
    </Pressable>
  );
}

function Actions({
  items,
  onDone,
}: {
  items: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }[];
  onDone: () => void;
}) {
  return (
    <View style={styles.actions}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          disabled={it.disabled}
          onPress={() => {
            it.onPress();
            onDone();
          }}
          style={[styles.action, it.disabled && styles.off]}
        >
          <Text style={[styles.actionText, it.danger && styles.actionDanger]}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Champ numérique tolérant la saisie vide le temps de taper. */
function SetsCell({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        const clean = t.replace(/\D/g, '');
        setText(clean);
        const n = parseInt(clean, 10);
        if (n >= 1 && n <= 50) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
      keyboardType="number-pad"
      inputMode="numeric"
      selectTextOnFocus
      style={[styles.cell, styles.cSets, styles.center]}
    />
  );
}

const ROW_H = 44;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerBtns: { flexDirection: 'row', gap: spacing.md, marginRight: spacing.md },
  page: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },

  filters: { gap: spacing.sm, paddingBottom: spacing.md },
  chips: { gap: spacing.xs + 2, alignItems: 'center' },
  chip: {
    height: 32,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSmall: { height: 28, paddingHorizontal: spacing.sm + 2 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipGhost: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  chipTextSmall: { fontSize: 12 },
  chipTextOn: { color: colors.white },
  chipTextGhost: { color: colors.pinkDeep, fontFamily: fonts.bodyBold },

  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
  },
  headCell: {
    paddingHorizontal: spacing.sm + 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cExo: { flex: 3, minWidth: 0 },
  cSets: { width: 60, flexShrink: 0 },
  tight: { paddingHorizontal: 2 },
  cReps: { flex: 1.3, minWidth: 0 },
  cLoad: { flex: 1.7, minWidth: 0 },
  cRest: { width: 64, flexShrink: 0 },
  cMenu: { width: 32, flexShrink: 0 },
  gripCol: { width: 22 },
  cFormat: { width: 96, flexShrink: 0 },
  formatCell: { alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: spacing.sm },
  suggestions: {
    marginLeft: 22,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
    boxShadow: '0 6px 18px rgba(24, 24, 27, 0.08)',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  headRowStacked: { paddingLeft: 22 },
  center: { textAlign: 'center' },

  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  weekTitleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  weekTitle: { fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: -0.4, color: colors.text },
  fold: {
    width: 18,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.textLight,
  },
  foldOpen: { transform: [{ rotate: '90deg' }] },

  session: { marginTop: spacing.sm },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 38,
    paddingLeft: spacing.xs,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.sm,
  },
  sessionTitle: {
    flex: 1,
    minWidth: 0,
    height: 38,
    paddingHorizontal: spacing.xs,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textLight, paddingHorizontal: spacing.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_H,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowStack: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.xs },
  rowTop: { flexDirection: 'row', alignItems: 'center', height: 40 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', height: 34, paddingLeft: 22 },
  cell: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  cellName: { fontFamily: fonts.bodyMedium },

  menuBtn: { height: 28, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  menuBtnOn: { backgroundColor: colors.pinkSoft },
  menuDots: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textLight, lineHeight: 18 },
  menuDotsOn: { color: colors.pinkDeep },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  action: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundAlt,
  },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text },
  actionDanger: { color: '#C2410C' },
  off: { opacity: 0.35 },

  addRow: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm + 2 },
  addSession: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  addText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },

  split: { flex: 1, flexDirection: 'row', width: '100%', maxWidth: 1240, alignSelf: 'center' },
  sidebar: { width: 230, flexGrow: 0, borderRightWidth: 1, borderRightColor: colors.border },
  sidebarContent: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: 2 },
  navSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  navItem: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 3, borderRadius: radii.sm },
  navItemSub: { paddingLeft: spacing.lg },
  navItemOn: { backgroundColor: colors.pinkSoft },
  navText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  navTextSub: { fontFamily: fonts.body, color: colors.textMuted },
  navTextOn: { color: colors.pinkDeep },
  navAdd: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 3 },
  main: { flex: 1 },
  mainContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, maxWidth: 960 },
});
