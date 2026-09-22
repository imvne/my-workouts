import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { canUseFiles, downloadCsv, pickCsv } from '@/lib/csvFile';
import { csvToProgram, programToCsv } from '@/lib/programCsv';
import { useProgramStore } from '@/store/programStore';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

export default function Transfer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const program = useProgramStore((s) => s.program);
  const progress = useProgramStore((s) => s.progress);
  const done = useProgramStore((s) => s.done);
  const importProgram = useProgramStore((s) => s.importProgram);

  const [text, setText] = useState(() => (program ? programToCsv(program, progress, done) : ''));
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onPaste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText(clip);
  };

  const importText = (source: string) => {
    try {
      const parsed = csvToProgram(source);
      importProgram(parsed.program, parsed.progress, parsed.done);
      router.dismissTo('/');
    } catch (e) {
      notify('Import impossible', e instanceof Error ? e.message : String(e));
    }
  };

  const onPickFile = async () => {
    const content = await pickCsv();
    if (content) importText(content);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {canUseFiles && (
          <View style={styles.row}>
            <Button
              title="Télécharger .csv"
              onPress={() => downloadCsv(text)}
              disabled={!text}
              style={styles.flex}
            />
            <Button
              title="Importer un .csv"
              variant="secondary"
              onPress={onPickFile}
              style={styles.flex}
            />
          </View>
        )}

        <View style={styles.row}>
          <Button
            title={copied ? 'Copié ✓' : 'Copier'}
            variant={canUseFiles ? 'ghost' : 'primary'}
            onPress={onCopy}
            disabled={!text}
            style={styles.flex}
          />
          <Button title="Coller" variant="ghost" onPress={onPaste} style={styles.flex} />
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={'# weeks=4\nséance;titre;exo;séries;S1;S2;S3;S4\n1;Haut;Pull up;3;1 pdc;;;'}
          placeholderTextColor={colors.textLight}
          style={styles.textarea}
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Importer ce texte"
          variant={canUseFiles ? 'ghost' : 'primary'}
          onPress={() => importText(text)}
          disabled={!text.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.sm },
  textarea: {
    minHeight: 320,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
