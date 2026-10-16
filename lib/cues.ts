// Bips et écran allumé pendant un chrono (web uniquement ; ignoré ailleurs).
import { Platform } from 'react-native';

import { useProgramStore } from '@/store/programStore';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!isWeb) return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

/** À appeler dans un geste utilisateur (iOS n'autorise le son qu'après un tap). */
export function unlockAudio() {
  audio()?.resume();
}

export function beep(freq = 880, ms = 160) {
  if (!useProgramStore.getState().settings.sound) return;
  const c = audio();
  if (c) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    o.start();
    o.stop(c.currentTime + ms / 1000);
  }
  if (isWeb) navigator.vibrate?.(120);
}

type WakeLock = { release: () => Promise<void> };
let lock: WakeLock | null = null;

export async function keepAwake(on: boolean) {
  if (!isWeb) return;
  const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } }).wakeLock;
  try {
    if (on && wl && !lock) lock = await wl.request('screen');
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}
