import { supabase } from '@/lib/supabase';
import { snapshot, useProgramStore, type CloudData } from '@/store/programStore';

let userId: string | null = null;
let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

async function push() {
  if (!userId) return;
  await supabase
    .from('user_programs')
    .upsert({ user_id: userId, data: snapshot(), updated_at: new Date().toISOString() });
}

/** Charge la prog du compte (ou y envoie la prog locale la 1re fois), puis sauvegarde à chaque modif. */
export async function startSync(id: string) {
  stopSync();
  userId = id;
  const { data, error } = await supabase
    .from('user_programs')
    .select('data')
    .eq('user_id', id)
    .maybeSingle();
  if (userId !== id) return; // déconnecté entre-temps
  if (!error) {
    const cloud = data?.data as CloudData | undefined;
    if (cloud?.program) {
      applying = true;
      useProgramStore.getState().hydrateCloud(cloud);
      applying = false;
    } else {
      await push();
    }
  }
  unsubscribe = useProgramStore.subscribe(() => {
    if (applying) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 800);
  });
}

export function stopSync() {
  unsubscribe?.();
  unsubscribe = null;
  if (timer) clearTimeout(timer);
  timer = null;
  userId = null;
}

export async function signOut() {
  stopSync();
  await supabase.auth.signOut();
  useProgramStore.getState().resetAll();
}
