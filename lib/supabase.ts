import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    // Pas de `window` pendant l'export statique : la session ne vit que côté navigateur.
    storage: typeof window === 'undefined' && Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Identifiant libre (« namimino9 ») → adresse interne, jamais affichée. */
export function loginToEmail(login: string): string {
  const id = login.trim().toLowerCase();
  return id.includes('@') ? id : `${id}@example.com`;
}
