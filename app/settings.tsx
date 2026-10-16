import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useProgramStore } from '@/store/programStore';

// Ordre affiché lundi → dimanche ; valeur = getDay() (0 = dimanche).
const DAYS: [number, string][] = [
  [1, 'Lun'],
  [2, 'Mar'],
  [3, 'Mer'],
  [4, 'Jeu'],
  [5, 'Ven'],
  [6, 'Sam'],
  [0, 'Dim'],
];
const PREP = [0, 5, 10, 15];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const settings = useProgramStore((s) => s.settings);
  const update = useProgramStore((s) => s.updateSettings);

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <Section title="Ma semaine commence le">
        <View style={styles.chips}>
          {DAYS.map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              active={settings.weekStartDay === value}
              onPress={() => update({ weekStartDay: value })}
            />
          ))}
        </View>
      </Section>

      <Section title="Décompte avant un chrono">
        <View style={styles.chips}>
          {PREP.map((s) => (
            <Chip
              key={s}
              label={s === 0 ? 'Aucun' : `${s} s`}
              active={settings.prepSeconds === s}
              onPress={() => update({ prepSeconds: s })}
            />
          ))}
        </View>
      </Section>

      <Section title="Repos par défaut entre les séries">
        <TextInput
          value={settings.defaultRest}
          onChangeText={(defaultRest) => update({ defaultRest })}
          style={styles.input}
        />
      </Section>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Bips sonores</Text>
        <Switch
          value={settings.sound}
          onValueChange={(sound) => update({ sound })}
          trackColor={{ true: colors.pinkDeep, false: colors.borderStrong }}
          thumbColor={colors.white}
          // web : la couleur « activé » du pouce
          {...({ activeThumbColor: colors.white } as object)}
        />
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.md, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: {
    minWidth: 48,
    height: 36,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textMuted },
  chipTextOn: { color: colors.white },
  input: {
    height: 44,
    width: 120,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
});
