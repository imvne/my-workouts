import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtClock } from '@/components/workout/TimedExercise';
import { fonts, spacing } from '@/constants/theme';
import { formatLabel, formatOf } from '@/lib/formats';
import { formatDuration, sessionDuration, summarize, useProgramStore } from '@/store/programStore';
import type { ProgramSession } from '@/types/program';

// Palette du récap : pensé pour être posé sur une photo (story), donc blanc + rose clair.
const INK = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.72)';
const FAINT = 'rgba(255,255,255,0.35)';
const PINK = '#F7A8BE';
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } };


/** Récap plein écran de la séance, exportable en PNG transparent pour une story. */
export function SessionRecap({
  visible,
  onClose,
  week,
  session,
}: {
  visible: boolean;
  onClose: () => void;
  week: number;
  session: ProgramSession | null;
}) {
  const insets = useSafeAreaInsets();
  const done = useProgramStore((s) => s.done);
  const skipped = useProgramStore((s) => s.skipped);
  const results = useProgramStore((s) => s.results);
  const log = useProgramStore((s) => s.log);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  const exercises = session.exercises;
  const doneCount = exercises.filter((e) => done[e.id]).length;
  const setsCount = exercises.filter((e) => done[e.id]).reduce((n, e) => n + e.sets, 0);
  const l = log[session.id];
  // Chrono de séance arrêté, sinon 1 h 45 si finie, sinon le temps écoulé depuis le lancement.
  const ms = sessionDuration(l) ?? (l?.startedAt ? Date.now() - l.startedAt : 0);
  const date = new Date(l?.finishedAt ?? l?.startedAt ?? Date.now()).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const share = async () => {
    if (Platform.OS !== 'web' || !cardRef.current) return;
    setBusy(true);
    try {
      const { toPng } = await import('html-to-image');
      const node = cardRef.current as unknown as HTMLElement;
      const dataUrl = await toPng(node, { pixelRatio: 3, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const name = `${session.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'seance'}.png`;
      const file = new File([blob], name, { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = name;
        a.click();
      }
    } catch {
      // partage annulé : rien à faire
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer" style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Carte exportée : fond transparent, seul le contenu apparaît dans le PNG */}
          <View ref={cardRef} collapsable={false} style={styles.card}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <View style={styles.logoHandle} />
                <View style={styles.logoBody} />
              </View>
              <Text style={[styles.brand, SHADOW]}>WORKOUTS</Text>
            </View>

            <Text style={[styles.kicker, SHADOW]}>
              Semaine {week} · {date}
            </Text>
            <Text style={[styles.title, SHADOW]}>{session.title}</Text>

            <View style={styles.stats}>
              <Stat value={`${doneCount}/${exercises.length}`} label="exos" />
              <Stat value={String(setsCount)} label="séries" />
              <Stat value={ms > 0 ? formatDuration(ms) : '—'} label="durée" />
            </View>

            <View style={styles.list}>
              {exercises.map((e, i) => {
                const format = formatOf(e);
                const r = results[e.id];
                const linked = e.linkNext || exercises[i - 1]?.linkNext;
                const detail = [
                  format !== 'sets' && formatLabel(format),
                  `${e.sets} × ${summarize(e.reps) || '—'}`,
                  summarize(e.loads),
                ]
                  .filter(Boolean)
                  .join('  ·  ');
                return (
                  <View key={e.id} style={[styles.item, linked && styles.itemLinked]}>
                    <Text style={[styles.index, SHADOW]}>{String(i + 1).padStart(2, '0')}</Text>
                    <View style={styles.itemBody}>
                      <Text style={[styles.itemName, skipped[e.id] && styles.itemSkipped, SHADOW]} numberOfLines={2}>
                        {e.name}
                      </Text>
                      <Text style={[styles.itemDetail, SHADOW]} numberOfLines={1}>
                        {detail}
                      </Text>
                    </View>
                    {r?.finished && format !== 'emom' && format !== 'tabata' ? (
                      <Text style={[styles.result, SHADOW]}>
                        {fmtClock(r.ms, true)}
                        {r.reps ? `\n${r.reps} reps` : ''}
                      </Text>
                    ) : (
                      <Text style={[styles.status, skipped[e.id] && styles.statusSkipped, SHADOW]}>
                        {done[e.id] ? '✓' : skipped[e.id] ? '✕' : '·'}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={[styles.footerText, SHADOW]}>myworkoutsnotebook</Text>
            </View>
          </View>
        </ScrollView>

        {Platform.OS === 'web' && (
          <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable onPress={share} disabled={busy} style={styles.shareBtn}>
              {busy ? (
                <ActivityIndicator color="#18181B" />
              ) : (
                <Text style={styles.shareText}>Partager en story</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, SHADOW]}>{value}</Text>
      <Text style={[styles.statLabel, SHADOW]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#141416' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  closeText: { color: INK, fontSize: 16, fontFamily: fonts.bodyBold },
  scroll: { alignItems: 'center', paddingVertical: spacing.lg },

  card: { width: 360, paddingHorizontal: 28, paddingVertical: 36, gap: 22, backgroundColor: 'transparent' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 18, height: 20, alignItems: 'center' },
  logoHandle: { width: 14, height: 9, borderWidth: 2.5, borderBottomWidth: 0, borderColor: PINK, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  logoBody: { width: 18, height: 13, marginTop: -2, borderRadius: 9, backgroundColor: PINK },
  brand: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 3, color: INK },

  kicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: PINK },
  title: { fontFamily: fonts.displayBold, fontSize: 46, lineHeight: 48, letterSpacing: -2, color: INK, marginTop: -12 },

  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderTopWidth: 2, borderTopColor: PINK, paddingTop: 10, gap: 2 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: -1, color: INK },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: SOFT },

  list: { gap: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  itemLinked: { borderLeftWidth: 2, borderLeftColor: PINK, paddingLeft: 10, marginLeft: -12 },
  index: { width: 24, fontFamily: fonts.displayBold, fontSize: 14, color: PINK },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontFamily: fonts.bodyBold, fontSize: 17, color: INK },
  itemSkipped: { color: FAINT, textDecorationLine: 'line-through' },
  itemDetail: { fontFamily: fonts.body, fontSize: 13, color: SOFT },
  status: { width: 28, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 18, color: PINK },
  statusSkipped: { color: FAINT },
  result: { textAlign: 'right', fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 20, color: PINK, fontVariant: ['tabular-nums'] },

  footer: { gap: 10, marginTop: 4 },
  footerLine: { height: 1, backgroundColor: FAINT },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 1.5, color: SOFT },

  actions: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  shareBtn: { height: 52, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  shareText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#18181B' },
});
