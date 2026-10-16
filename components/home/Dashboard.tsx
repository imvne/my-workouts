import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import {
  firstUntreated,
  isTreated,
  nextWeekStart,
  sessionsOf,
  useProgramStore,
} from '@/store/programStore';
import type { ProgramSession } from '@/types/program';

type Status = 'done' | 'skipped' | 'partial' | 'todo';

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
  onStart: () => void;
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
  const [force, setForce] = useState(false);

  const statusOf = (session: ProgramSession): Status => {
    const ids = session.exercises.map((e) => e.id);
    const d = ids.filter((id) => done[id]).length;
    const treated = ids.filter((id) => isTreated(id, done, skipped)).length;
    if (treated === ids.length) return d > 0 ? 'done' : 'skipped';
    if (treated > 0 || log[session.id]?.startedAt) return 'partial';
    return 'todo';
  };

  /** Choisir une séance : on se place sur son premier exo non traité. */
  const pick = (week: number, si: number) => {
    const session = sessionsOf(program, week)[si];
    const ei = Math.max(
      0,
      session.exercises.findIndex((e) => !isTreated(e.id, done, skipped)),
    );
    setProgress({ week, session: si, exercise: ei, set: 0 });
  };

  const blockDone = firstUntreated(program, done, skipped) === null;
  const week = progress.week;
  const sessions = sessionsOf(program, week);
  const session = sessions[Math.min(progress.session, sessions.length - 1)];
  const status = session ? statusOf(session) : 'todo';

  // Semaine précédente finie et nouvelle semaine pas encore commencée : on attend le jour de reprise.
  const prev = week > 1 ? sessionsOf(program, week - 1) : [];
  const prevFinished = prev.length > 0 && prev.every((s) => statusOf(s) === 'done' || statusOf(s) === 'skipped');
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
  const totalSessions = program.weeks.reduce((n, _, i) => n + sessionsOf(program, i + 1).length, 0);
  const totalDone = program.weeks.reduce(
    (n, _, i) => n + sessionsOf(program, i + 1).filter((s) => statusOf(s) === 'done').length,
    0,
  );

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
        ) : session ? (
          <>
            <Text style={styles.kicker}>
              Semaine {week} · {status === 'partial' ? 'en cours' : 'prochaine séance'}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {session.title}
            </Text>
            <Text style={styles.meta}>
              {session.exercises.length} exo{session.exercises.length > 1 ? 's' : ''} ·{' '}
              {session.exercises.reduce((n, e) => n + e.sets, 0)} séries
            </Text>
            <Button
              title={status === 'partial' ? 'Reprendre la séance' : 'Commencer la séance'}
              onPress={onStart}
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
          const ws = sessionsOf(program, wi + 1);
          const current = wi + 1 === week;
          return (
            <View key={w.id} style={styles.weekRow}>
              <Text style={[styles.weekLabel, current && styles.weekLabelOn]}>S{wi + 1}</Text>
              <View style={styles.dots}>
                {ws.map((s, si) => (
                  <Pressable
                    key={s.id}
                    onPress={() => pick(wi + 1, si)}
                    style={styles.dotCell}
                    accessibilityLabel={`${s.title}, semaine ${wi + 1}`}
                  >
                    <Dot status={statusOf(s)} next={current && si === progress.session && !blockDone} />
                    <Text numberOfLines={1} style={styles.dotLabel}>
                      {s.title}
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

function Dot({ status, next }: { status: Status; next: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        status === 'done' && styles.dotDone,
        status === 'skipped' && styles.dotSkipped,
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
