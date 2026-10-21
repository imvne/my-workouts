import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ProgramSession } from '@/types/program';

/** « 52:07 » ou « 1:04:12 ». */
export function fmtElapsed(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** Chrono de séance dans l'en-tête, entre le menu et le récap. */
export function HeaderClock({ startedAt }: { startedAt?: number }) {
  const now = useNow(!!startedAt);
  if (!startedAt) return null;
  return <Text style={styles.header}>{fmtElapsed(now - startedAt)}</Text>;
}

/** Écran flouté avant de lancer le chrono de séance. */
export function SessionReady({
  week,
  session,
  onStart,
  onCancel,
}: {
  week: number;
  session: ProgramSession;
  onStart: () => void;
  onCancel: () => void;
}) {
  const first = session.exercises[0];
  return (
    <View style={styles.fill}>
      {/* Aperçu flou du premier exo, derrière la carte */}
      <View style={[styles.preview, blur]} pointerEvents="none">
        <Text style={styles.previewName}>{first?.name}</Text>
        <Text style={styles.previewBig}>{first?.reps[0] || first?.sets}</Text>
      </View>
      <View style={styles.overlay}>
        <Text style={styles.kicker}>Semaine {week}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {session.title}
        </Text>
        <Text style={styles.meta}>
          {session.exercises.length} exo{session.exercises.length > 1 ? 's' : ''} ·{' '}
          {session.exercises.reduce((n, e) => n + e.sets, 0)} séries
        </Text>
        <Text style={styles.clockIdle}>0:00</Text>
        <Button title="Lancer la séance" onPress={onStart} style={styles.cta} />
        <Text onPress={onCancel} style={styles.link}>
          Annuler
        </Text>
      </View>
    </View>
  );
}

/** Fin de séance : le chrono tourne jusqu'à « Arrêter la séance ». */
export function SessionEnd({
  session,
  startedAt,
  allDone,
  onStop,
  onBack,
}: {
  session: ProgramSession;
  startedAt?: number;
  allDone: boolean;
  onStop: () => void;
  onBack?: () => void;
}) {
  const now = useNow(!!startedAt);
  return (
    <View style={styles.fill}>
      <View style={styles.overlay}>
        <Text style={styles.kicker}>{allDone ? 'Séance terminée' : 'Fin de séance'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {session.title}
        </Text>
        <Text style={styles.clock}>{startedAt ? fmtElapsed(now - startedAt) : '—'}</Text>
        <Text style={styles.clockLabel}>durée de la séance</Text>
        <Button title="Arrêter la séance" onPress={onStop} style={styles.cta} />
        {onBack && (
          <Text onPress={onBack} style={styles.link}>
            Reprendre la séance
          </Text>
        )}
      </View>
    </View>
  );
}

// Flou de l'aperçu (web : filtre CSS ; ignoré là où il n'existe pas).
const blur = { filter: 'blur(16px)', opacity: 0.22 } as object;

const styles = StyleSheet.create({
  header: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  fill: { flex: 1, justifyContent: 'center' },
  preview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  previewName: { fontFamily: fonts.displayBold, fontSize: 38, color: colors.text },
  previewBig: { fontFamily: fonts.displayBold, fontSize: 96, color: colors.pinkDeep },
  overlay: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
    color: colors.text,
    textAlign: 'center',
  },
  meta: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  clockIdle: {
    marginTop: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 72,
    letterSpacing: -3,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  clock: {
    marginTop: spacing.lg,
    fontFamily: fonts.displayBold,
    fontSize: 88,
    lineHeight: 96,
    letterSpacing: -3,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  clockLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cta: { alignSelf: 'stretch', marginTop: spacing.xl, paddingVertical: spacing.md + 4 },
  link: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textMuted,
  },
});
