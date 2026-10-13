import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { loginToEmail, supabase } from '@/lib/supabase';

function frenchError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Identifiant ou mot de passe incorrect.';
  if (/email not confirmed/i.test(message))
    return 'Compte pas encore activé : coupe « Confirm email » dans Supabase.';
  if (/already registered/i.test(message)) return 'Cet identifiant existe déjà.';
  if (/at least 6/i.test(message)) return 'Mot de passe : 6 caractères minimum.';
  return message;
}

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!login.trim() || !password) return;
    setBusy(true);
    setError(null);
    const email = loginToEmail(login);
    const { error: err } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) setError(frenchError(err.message));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.box}>
          <Text style={styles.brand}>Workouts</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Identifiant</Text>
            <TextInput
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                onSubmitEditing={submit}
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                style={styles.eye}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
              </Pressable>
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {busy ? (
            <ActivityIndicator color={colors.pinkDeep} style={styles.spinner} />
          ) : (
            <Button
              title={mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
              onPress={submit}
              disabled={!login.trim() || !password}
            />
          )}

          <Pressable
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
            hitSlop={8}
            style={styles.switch}
          >
            <Text style={styles.switchText}>
              {mode === 'signin' ? 'Créer un compte' : 'J’ai déjà un compte'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, justifyContent: 'center' },
  box: { width: '100%', maxWidth: 380, alignSelf: 'center', padding: spacing.lg, gap: spacing.md },
  brand: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    letterSpacing: -1.5,
    color: colors.text,
    marginBottom: spacing.md,
  },
  field: { gap: spacing.xs },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  passwordRow: { justifyContent: 'center' },
  passwordInput: { paddingRight: 84 },
  eye: { position: 'absolute', right: spacing.md, paddingVertical: spacing.xs },
  eyeText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.pinkDeep },
  error: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#C2410C' },
  spinner: { height: 50 },
  switch: { alignSelf: 'center', paddingVertical: spacing.sm },
  switchText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.pinkDeep },
});
