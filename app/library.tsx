import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormatPicker, FormatTag } from '@/components/ui/FormatPicker';
import { colors, fonts, spacing } from '@/constants/theme';
import { useProgramStore } from '@/store/programStore';

export default function Library() {
  const insets = useSafeAreaInsets();
  const library = useProgramStore((s) => s.library);
  const add = useProgramStore((s) => s.addLibraryItem);
  const update = useProgramStore((s) => s.updateLibraryItem);
  const remove = useProgramStore((s) => s.removeLibraryItem);
  const [picking, setPicking] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.headRow}>
        <Text style={[styles.head, styles.cName]}>Exercice</Text>
        <Text style={[styles.head, styles.cFormat]}>Format</Text>
        <View style={styles.cDel} />
      </View>

      {library.map((item) => (
        <View key={item.id}>
          <View style={styles.row}>
            <TextInput
              value={item.name}
              onChangeText={(name) => update(item.id, { name })}
              style={[styles.cell, styles.cName]}
            />
            <Pressable
              onPress={() => setPicking(picking === item.id ? null : item.id)}
              style={[styles.cFormat, styles.formatCell]}
            >
              <FormatTag format={item.format} />
            </Pressable>
            <Pressable
              onPress={() => remove(item.id)}
              hitSlop={8}
              accessibilityLabel="Supprimer"
              style={styles.cDel}
            >
              <Text style={styles.del}>✕</Text>
            </Pressable>
          </View>
          {picking === item.id && (
            <FormatPicker
              value={item.format}
              onPick={(format) => {
                update(item.id, { format });
                setPicking(null);
              }}
            />
          )}
        </View>
      ))}

      <Pressable onPress={() => add({ name: '', format: 'sets' })} style={styles.add}>
        <Text style={styles.addText}>+ Exercice</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.md },
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
  },
  head: {
    paddingHorizontal: spacing.sm + 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm + 2,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  cName: { flex: 1, minWidth: 0 },
  cFormat: { width: 110 },
  formatCell: { paddingHorizontal: spacing.sm + 2, justifyContent: 'center', alignSelf: 'stretch' },
  cDel: { width: 32, alignItems: 'center' },
  del: { fontSize: 13, color: colors.textLight },
  add: { paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm + 2 },
  addText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },
});
