import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { BAND_KG, colors, fonts, radii, spacing } from '@/constants/theme';
import { currentBlock } from '@/data/programming';
import { useWorkoutStore } from '@/store/workoutStore';

export default function AthleteHome() {
  const router = useRouter();
  const currentWeek = useWorkoutStore((s) => s.currentWeek);
  const setCurrentWeek = useWorkoutStore((s) => s.setCurrentWeek);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.pinkSoft + '88', colors.background]}
        style={styles.banner}
      >
        <Text style={styles.kicker}>Programmation</Text>
        <Text style={styles.title}>{currentBlock.name}</Text>
        <Text style={styles.meta}>{currentBlock.weeks} semaines · 4 séances</Text>
      </LinearGradient>

      <Text style={styles.sectionLabel}>Semaine en cours</Text>
      <View style={styles.weeks}>
        {Array.from({ length: currentBlock.weeks }, (_, i) => i + 1).map((week) => {
          const active = week === currentWeek;
          return (
            <Pressable
              key={week}
              onPress={() => setCurrentWeek(week)}
              style={[styles.weekChip, active && styles.weekChipActive]}
            >
              <Text style={[styles.weekText, active && styles.weekTextActive]}>S{week}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeSession ? (
        <View style={styles.resume}>
          <Text style={styles.resumeTitle}>Séance en cours</Text>
          <Button
            title="Reprendre"
            onPress={() =>
              router.push(`/(athlete)/session/${activeSession.sessionId}/run`)
            }
          />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Séances</Text>
      <View style={styles.sessions}>
        {currentBlock.sessions.map((session) => (
          <Pressable
            key={session.id}
            onPress={() => router.push(`/(athlete)/session/${session.id}`)}
            style={styles.sessionRow}
          >
            <View>
              <Text style={styles.sessionName}>{session.name}</Text>
              <Text style={styles.sessionMeta}>
                {session.exercises.length} exercices · semaine {currentWeek}
              </Text>
            </View>
            <Text style={styles.chevron}>→</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bands}>
        <Text style={styles.sectionLabel}>Élastiques</Text>
        <Text style={styles.bandLine}>Bleu · {BAND_KG.bleu} kg</Text>
        <Text style={styles.bandLine}>Vert · {BAND_KG.vert} kg</Text>
        <Text style={styles.bandLine}>Jaune · {BAND_KG.jaune} kg</Text>
      </View>

      <Link href="/(athlete)/history" asChild>
        <Pressable style={styles.historyLink}>
          <Text style={styles.historyText}>Voir l’historique</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  banner: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.pinkDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  weeks: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  weekChipActive: {
    backgroundColor: colors.pinkDeep,
    borderColor: colors.pinkDeep,
  },
  weekText: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  weekTextActive: {
    color: colors.white,
  },
  resume: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.pinkSoft + '66',
    borderRadius: radii.md,
  },
  resumeTitle: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  sessions: {
    gap: spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionName: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.text,
  },
  sessionMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.pinkDeep,
  },
  bands: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  bandLine: {
    fontFamily: fonts.body,
    color: colors.textMuted,
    fontSize: 14,
  },
  historyLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  historyText: {
    fontFamily: fonts.bodyMedium,
    color: colors.pinkDeep,
    fontSize: 16,
  },
});
