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
      <Section title="Semaine">
        <Item label="Début de semaine" stacked>
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
        </Item>
      </Section>

      <Section title="Chronomètres">
        <Item label="Décompte avant le départ" stacked>
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
        </Item>
        <Item label="Bips sonores" last>
          <Switch
            value={settings.sound}
            onValueChange={(sound) => update({ sound })}
            trackColor={{ true: colors.pinkDeep, false: colors.borderStrong }}
            thumbColor={colors.white}
            {...({ activeThumbColor: colors.white } as object)}
          />
        </Item>
      </Section>

      <Section title="Séries">
        <Item label="Repos par défaut" last>
          <TextInput
            value={settings.defaultRest}
            onChangeText={(defaultRest) => update({ defaultRest })}
            style={styles.input}
          />
        </Item>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** Ligne de réglage : libellé à gauche, contrôle à droite (ou dessous si `stacked`). */
function Item({
  label,
  stacked,
  last,
  children,
}: {
  label: string;
  stacked?: boolean;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.item, stacked && styles.itemStacked, !last && styles.itemDivider]}>
      <Text style={styles.itemLabel}>{label}</Text>
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
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  itemStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.sm },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: {
    minWidth: 44,
    height: 34,
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
    height: 40,
    width: 96,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
});
