import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';

import { Login } from '@/components/Login';
import { colors, fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { startSync, stopSync } from '@/lib/sync';
import { useProgramStore } from '@/store/programStore';
import { useWorkoutStore } from '@/store/workoutStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useWorkoutStore((s) => s.hydrated);
  const setHydrated = useWorkoutStore((s) => s.setHydrated);

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [programReady, setProgramReady] = useState(() => useProgramStore.persist.hasHydrated());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (programReady) return;
    return useProgramStore.persist.onFinishHydration(() => setProgramReady(true));
  }, [programReady]);

  // La prog locale doit être chargée avant de la comparer à celle du compte.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (userId && programReady) startSync(userId);
    else stopSync();
  }, [userId, programReady]);

  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    // If persist finishes before mount listener, mark hydrated from hasHydrated
    if (useWorkoutStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    const unsub = useWorkoutStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, [setHydrated]);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  const ready = fontsLoaded && hydrated && authReady && programReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.pinkDeep} />
      </View>
    );
  }

  // Dev local uniquement : EXPO_PUBLIC_SKIP_AUTH=1 dans .env.local pour tester sans compte.
  const skipAuth = __DEV__ && process.env.EXPO_PUBLIC_SKIP_AUTH === '1';

  if (!session && !skipAuth) {
    return (
      <>
        <StatusBar style="dark" />
        <Login />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bodyBold, fontSize: 16 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: '' }} />
        <Stack.Screen name="edit" options={{ title: 'Ma prog', presentation: 'modal' }} />
        <Stack.Screen name="transfer" options={{ title: 'Sauvegarde & import' }} />
        <Stack.Screen name="position" options={{ title: 'Où j’en suis', presentation: 'modal' }} />
        <Stack.Screen name="library" options={{ title: 'Bibliothèque' }} />
        <Stack.Screen name="(athlete)" options={{ headerShown: false }} />
        <Stack.Screen name="(coach)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
