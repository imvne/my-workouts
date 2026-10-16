import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { snapshot, useProgramStore, type CloudData } from '@/store/programStore';

export type SyncStatus = 'saved' | 'dirty' | 'saving' | 'error';
export const useSyncStore = create<{ status: SyncStatus }>(() => ({ status: 'saved' }));
const setStatus = (status: SyncStatus) => useSyncStore.setState({ status });

let userId: string | null = null;
let unsubscribe: (() => void) | null = null;
let stopFocus: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
/** Date de la dernière version connue côté Supabase (pour ne pas recharger pour rien). */
let remoteAt = 0;

async function push() {
  if (!userId) return;
  setStatus('saving');
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('user_programs')
    .upsert({ user_id: userId, data: snapshot(), updated_at: updatedAt });
  if (error) return setStatus('error');
  remoteAt = Date.parse(updatedAt);
  // Une modif a pu arriver pendant l'envoi : elle repassera au prochain tour.
  if (useSyncStore.getState().status === 'saving') setStatus('saved');
}

/** Envoi immédiat (bouton « Enregistrer »). */
export async function saveNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  await push();
}

function applyCloud(data: CloudData) {
  applying = true;
  useProgramStore.getState().hydrateCloud(data);
  applying = false;
}

/** Recharge la version Supabase si elle est plus récente (autre appareil). */
async function pull() {
  if (!userId || useSyncStore.getState().status !== 'saved') return;
  const { data, error } = await supabase
    .from('user_programs')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.data || useSyncStore.getState().status !== 'saved') return;
  const at = Date.parse(data.updated_at);
  if (at > remoteAt) {
    remoteAt = at;
    applyCloud(data.data as CloudData);
  }
}

function watchFocus(): () => void {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }
  const sub = AppState.addEventListener('change', (s) => s === 'active' && pull());
  return () => sub.remove();
}

/** Charge la prog du compte (ou y envoie la prog locale la 1re fois), puis sauvegarde à chaque modif. */
export async function startSync(id: string) {
  stopSync();
  userId = id;
  const { data, error } = await supabase
    .from('user_programs')
    .select('data, updated_at')
    .eq('user_id', id)
    .maybeSingle();
  if (userId !== id) return; // déconnecté entre-temps
  if (!error) {
    const cloud = data?.data as CloudData | undefined;
    if (cloud?.program) {
      remoteAt = Date.parse(data!.updated_at);
      applyCloud(cloud);
      setStatus('saved');
    } else {
      await push();
    }
  }
  unsubscribe = useProgramStore.subscribe(() => {
    if (applying) return;
    setStatus('dirty');
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 1500);
  });
  stopFocus = watchFocus();
}

export function stopSync() {
  unsubscribe?.();
  unsubscribe = null;
  stopFocus?.();
  stopFocus = null;
  if (timer) clearTimeout(timer);
  timer = null;
  userId = null;
  remoteAt = 0;
}

export async function signOut() {
  stopSync();
  await supabase.auth.signOut();
  useProgramStore.getState().resetAll();
}
