import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import {
  copyPreviousWeekSession,
  isTreated,
  previousWeekSession,
  nextWeekStart,
  sessionsOf,
  useProgramStore,
} from '@/store/programStore';
import type { ProgramProgress, ProgramSession } from '@/types/program';

type Status = 'done' | 'skipped' | 'partial' | 'todo' | 'empty';

/** Une séance du bloc telle qu'affichée : `si` = rang parmi les séances jouables (null si vide). */
type Slot = { week: number; session: ProgramSession; si: number | null };

const MAX_SESSION_MS = 4 * 3600_000;

function formatDuration(ms: number) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

/** Accueil : prochaine séance, suivi du bloc en points, chiffres de la semaine. */
export function Dashboard({
  onStart,
  onRecap,
}: {
  /** Lance la séance : `target` = premier exo à faire, `sessionId` pour le journal. */
  onStart: (target: ProgramProgress, sessionId: string) => void;
  onRecap: (week: number, sessionId: string) => void;
}) {
  const router = useRouter();
  const program = useProgramStore((s) => s.program)!;
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const skipped = useProgramStore((s) => s.skipped);
  const log = useProgramStore((s) => s.log);
  const settings = useProgramStore((s) => s.settings);
  const setProgress = useProgramStore((s) => s.setProgress);
  const saveProgram = useProgramStore((s) => s.saveProgram);
  const [force, setForce] = useState(false);

  const statusOf = (session: ProgramSession): Status => {
    const ids = session.exercises.filter((e) => e.name.trim()).map((e) => e.id);
    if (ids.length === 0) return 'empty';
    const d = ids.filter((id) => done[id]).length;
    const treated = ids.filter((id) => isTreated(id, done, skipped)).length;
    if (treated === ids.length) return d > 0 ? 'done' : 'skipped';
    if (treated > 0 || log[session.id]?.startedAt) return 'partial';
    return 'todo';
  };

  const slotsOf = (week: number): Slot[] => {
    const playable = sessionsOf(program, week);
    return (program.weeks[week - 1]?.sessions ?? []).map((raw) => {
      const si = playable.findIndex((p) => p.id === raw.id);
      return { week, session: si >= 0 ? playable[si] : raw, si: si >= 0 ? si : null };
    });
  };
  const allSlots = program.weeks.flatMap((_, wi) => slotsOf(wi + 1));
  const finishedStatus = (st: Status) => st === 'done' || st === 'skipped';

  // Séance mise en avant : celle choisie (tap sur un point), sinon la première pas finie du bloc.
  const [picked, setPicked] = useState<string | null>(null);
  const atProgress = allSlots.find(
    (sl) => sl.week === progress.week && sl.si === Math.min(progress.session, sessionsOf(program, progress.week).length - 1),
  );
  const hero =
    allSlots.find((sl) => sl.session.id === picked) ??
    (atProgress && !finishedStatus(statusOf(atProgress.session)) ? atProgress : undefined) ??
    allSlots.find((sl) => !finishedStatus(statusOf(sl.session)));

  const blockDone = !hero;
  const week = hero?.week ?? progress.week;
  const session = hero?.session;
  const status = session ? statusOf(session) : 'todo';
  const sessions = sessionsOf(program, week);

  const start = () => {
    if (!hero || hero.si === null) return;
    const ei = Math.max(0, hero.session.exercises.findIndex((e) => !isTreated(e.id, done, skipped)));
    const target = { week: hero.week, session: hero.si, exercise: ei, set: 0 };
    setProgress(target);
    onStart(target, hero.session.id);
  };

  // Semaine précédente finie et nouvelle semaine pas encore commencée : on attend le jour de reprise.
  const prev = week > 1 ? slotsOf(week - 1).map((sl) => sl.session) : [];
  const prevFinished = prev.length > 0 && prev.every((s) => finishedStatus(statusOf(s)));
  const weekStarted = sessions.some((s) => statusOf(s) !== 'todo');
  const prevEnd = Math.max(0, ...prev.map((s) => log[s.id]?.finishedAt ?? 0));
  const unlock = prevFinished && !weekStarted && prevEnd ? nextWeekStart(prevEnd, settings.weekStartDay) : null;
  const locked = !!unlock && Date.now() < unlock.getTime() && !force;

  // Chiffres de la semaine en cours.
  const weekDone = sessions.filter((s) => statusOf(s) === 'done').length;
  const weekMs = sessions.reduce((ms, s) => {
    const l = log[s.id];
    return l?.startedAt && l?.finishedAt ? ms + Math.min(MAX_SESSION_MS, l.finishedAt - l.startedAt) : ms;
  }, 0);
  const weekSets = sessions.reduce(
    (n, s) => n + s.exercises.filter((e) => done[e.id]).reduce((m, e) => m + e.sets, 0),
    0,
  );
  const totalSessions = allSlots.length;
  const totalDone = allSlots.filter((sl) => statusOf(sl.session) === 'done').length;

  // Dernière séance terminée (moins de 24 h) : raccourci vers son récap à partager.
  type Finished = { week: number; session: ProgramSession; at: number };
  const finished: Finished[] = program.weeks.flatMap((_, wi) =>
    sessionsOf(program, wi + 1)
      .map((session) => ({ week: wi + 1, session, at: log[session.id]?.finishedAt ?? 0 }))
      .filter((f) => f.at > 0),
  );
  const last = finished.sort((a, b) => b.at - a.at)[0];
  const recent = last && Date.now() - last.at < 24 * 3600_000 ? last : null;

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {recent && (
        <Pressable
          onPress={() => onRecap(recent.week, recent.session.id)}
          style={styles.recent}
          accessibilityLabel="Voir le récap"
        >
          <Text style={styles.recentCheck}>✓</Text>
          <Text style={styles.recentText} numberOfLines={1}>
            {recent.session.title} terminée
          </Text>
          <Text style={styles.recentLink}>Partager le récap ›</Text>
        </Pressable>
      )}
      {/* Prochaine séance */}
      <View style={styles.hero}>
        {blockDone ? (
          <>
            <Text style={styles.kicker}>Bloc terminé</Text>
            <Text style={styles.title}>Bravo.</Text>
            <Text style={styles.meta}>Toutes les séances du bloc sont faites.</Text>
            <Button title="Voir le détail" variant="ghost" onPress={() => router.push('/position')} />
          </>
        ) : locked ? (
          <>
            <Text style={styles.kicker}>Semaine {week - 1}</Text>
            <Text style={styles.title}>Terminée ✓</Text>
            <Text style={styles.meta}>
              Semaine {week} à partir de{' '}
              {unlock!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Pressable onPress={() => setForce(true)} hitSlop={8} style={styles.link}>
              <Text style={styles.linkText}>Commencer quand même</Text>
            </Pressable>
          </>
        ) : session && status === 'empty' ? (
          <>
            <Text style={styles.kicker}>Semaine {week} · à programmer</Text>
            <Text style={styles.title} numberOfLines={2}>
              {session.title}
            </Text>
            <Text style={styles.meta}>Aucun exercice pour l’instant.</Text>
            {previousWeekSession(program, week - 1, session.id) && (
              <Button
                title={`Copier la semaine ${week - 1}`}
                onPress={() => {
                  const next = copyPreviousWeekSession(program, week - 1, session.id);
                  if (next) saveProgram(next);
                }}
                style={styles.cta}
              />
            )}
            <Button
              title="Programmer la séance"
              variant={previousWeekSession(program, week - 1, session.id) ? 'ghost' : 'primary'}
              onPress={() => router.push('/edit')}
              style={styles.cta}
            />
          </>
        ) : session ? (
          <>
            <Text style={styles.kicker}>
              Semaine {week} · {status === 'partial' ? 'en cours' : finishedStatus(status) ? 'déjà faite' : 'prochaine séance'}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {session.title}
            </Text>
            <Text style={styles.meta}>
              {session.exercises.length} exo{session.exercises.length > 1 ? 's' : ''} ·{' '}
              {session.exercises.reduce((n, e) => n + e.sets, 0)} séries
            </Text>
            <Button
              title={
                status === 'partial'
                  ? 'Reprendre la séance'
                  : finishedStatus(status)
                    ? 'Refaire la séance'
                    : 'Commencer la séance'
              }
              onPress={start}
              style={styles.cta}
            />
          </>
        ) : null}
      </View>

      {/* Bloc en points */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Ton bloc</Text>
          <Text style={styles.sectionMeta}>
            {totalDone} / {totalSessions} séances
          </Text>
        </View>
        {program.weeks.map((w, wi) => {
          const ws = slotsOf(wi + 1);
          const current = wi + 1 === week;
          return (
            <View key={w.id} style={styles.weekRow}>
              <Text style={[styles.weekLabel, current && styles.weekLabelOn]}>S{wi + 1}</Text>
              <View style={styles.dots}>
                {ws.map((sl) => (
                  <Pressable
                    key={sl.session.id}
                    onPress={() => setPicked(sl.session.id)}
                    style={styles.dotCell}
                    accessibilityLabel={`${sl.session.title}, semaine ${wi + 1}`}
                  >
                    <Dot status={statusOf(sl.session)} next={sl.session.id === session?.id} />
                    <Text numberOfLines={1} style={styles.dotLabel}>
                      {shortTitle(sl.session.title)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {/* Semaine en chiffres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cette semaine</Text>
        <View style={styles.tiles}>
          <Tile value={`${weekDone}/${sessions.length}`} label="séances" />
          <Tile value={weekMs ? formatDuration(weekMs) : '—'} label="d'entraînement" />
          <Tile value={String(weekSets)} label="séries" />
        </View>
      </View>
    </ScrollView>
  );
}

/** « Séance 1 - PU/Dos/Biceps » → « PU/Dos/Biceps » sous le point. */
function shortTitle(title: string) {
  const m = title.match(/^\s*s[ée]ance\s*\d+\s*[-–:·]\s*(.+)$/i);
  return (m ? m[1] : title).trim();
}

function Dot({ status, next }: { status: Status; next: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        status === 'done' && styles.dotDone,
        status === 'skipped' && styles.dotSkipped,
        status === 'empty' && styles.dotEmpty,
        next && styles.dotNext,
      ]}
    >
      {status === 'partial' && <View style={styles.dotHalf} />}
      {status === 'done' && <Text style={styles.dotCheck}>✓</Text>}
      {status === 'skipped' && <Text style={styles.dotSkip}>✕</Text>}
    </View>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const DOT = 26;

const styles = StyleSheet.create({
  page: { gap: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 44, letterSpacing: -1.5, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, marginBottom: spacing.sm },
  cta: { marginTop: spacing.xs },
  link: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  linkText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.pinkDeep },

  section: { gap: spacing.md },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.md,
    backgroundColor: colors.pinkSoft,
  },
  recentCheck: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.pinkDeep },
  recentText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  recentLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.pinkDeep },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionMeta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textLight },

  weekRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  weekLabel: { width: 26, paddingTop: 5, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textLight },
  weekLabelOn: { color: colors.pinkDeep },
  dots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dotCell: { width: 58, alignItems: 'center', gap: 4 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dotDone: { backgroundColor: colors.pinkDeep, borderColor: colors.pinkDeep },
  dotSkipped: { backgroundColor: colors.backgroundAlt, borderColor: colors.borderStrong },
  dotEmpty: { borderStyle: 'dashed', borderColor: colors.textLight },
  dotNext: { borderColor: colors.pinkDeep, borderWidth: 2.5 },
  dotHalf: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', backgroundColor: colors.pink },
  dotCheck: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  dotSkip: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textLight },
  dotLabel: { width: 58, textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },

  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    gap: 2,
  },
  tileValue: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.5, color: colors.text },
  tileLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
