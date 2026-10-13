import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { beep, keepAwake } from '@/lib/cues';
import { fmtClock } from '@/components/workout/TimedExercise';

/** Repos entre deux séries : compte à rebours, +15 s, ou on passe. */
export function RestTimer({
  endAt,
  total,
  nextTitle,
  nextDetail,
  onAdd,
  onDone,
}: {
  endAt: number;
  total: number;
  nextTitle: string;
  nextDetail: string;
  onAdd: (ms: number) => void;
  onDone: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const left = endAt - now;
  const seconds = Math.ceil(left / 1000);

  useEffect(() => {
    keepAwake(true);
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => {
      clearInterval(id);
      keepAwake(false);
    };
  }, []);

  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (seconds <= 3 && seconds >= 1 && lastTick.current !== seconds) {
      lastTick.current = seconds;
      beep(660, 100);
    }
    if (left <= 0) {
      beep(990, 450);
      onDone();
    }
  }, [seconds, left, onDone]);

  const progress = Math.min(1, Math.max(0, 1 - left / total));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Text style={styles.kicker}>Repos</Text>
        <Text style={styles.clock}>{fmtClock(left)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>Ensuite</Text>
          <Text style={styles.nextName} numberOfLines={1}>
            {nextTitle}
          </Text>
          {!!nextDetail && (
            <Text style={styles.nextDetail} numberOfLines={1}>
              {nextDetail}
            </Text>
          )}
        </View>
        <View style={styles.pair}>
          <Button title="+15 s" variant="ghost" onPress={() => onAdd(15000)} style={styles.flex} />
          <Button title="Passer" onPress={onDone} style={styles.flex} />
        </View>
        <Pressable style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  clock: {
    fontFamily: fonts.displayBold,
    fontSize: 112,
    lineHeight: 120,
    letterSpacing: -4,
    color: colors.pinkDeep,
    fontVariant: ['tabular-nums'],
  },
  track: { width: 220, height: 6, borderRadius: 3, backgroundColor: colors.white, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.pinkDeep },
  bottom: { gap: spacing.md },
  nextBox: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
  },
  nextLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nextName: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  nextDetail: { fontFamily: fonts.body, fontSize: 14, color: colors.pinkDeep },
  pair: { flexDirection: 'row', gap: spacing.sm },
  spacer: { height: 20 },
});
