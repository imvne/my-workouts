import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Web : localStorage (synchrone, conservé par la web app iPhone) ; mobile : AsyncStorage.
// Pendant l'export statique il n'y a pas de `window` : pas de stockage.
function sessionStorageBackend() {
  if (Platform.OS !== 'web') return AsyncStorage;
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export const supabase = createClient(url, key, {
  auth: {
    storage: sessionStorageBackend(),
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
