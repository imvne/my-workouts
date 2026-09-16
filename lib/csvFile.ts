// Fichier réel (.csv) — web uniquement ; sur natif on garde copier/coller.
import { Platform } from 'react-native';

export const canUseFiles = Platform.OS === 'web' && typeof document !== 'undefined';

const BOM = '﻿';

export async function downloadCsv(text: string, filename = 'ma-prog.csv') {
  if (!canUseFiles) return;
  // BOM pour qu'Excel/Numbers lisent les accents en UTF-8.
  const blob = new Blob([BOM + text], { type: 'text/csv;charset=utf-8' });

  // iOS Safari (surtout en PWA) ouvre le CSV au lieu de le télécharger :
  // la feuille de partage permet « Enregistrer dans Fichiers », AirDrop, Notes…
  const file = new File([blob], filename, { type: 'text/csv' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickCsv(): Promise<string | null> {
  if (!canUseFiles) return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,text/plain,text/comma-separated-values';
    // Safari iOS ne déclenche pas `change` sur un input détaché du DOM : on l'attache, caché.
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);
    const done = (value: string | null) => {
      input.remove();
      resolve(value);
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      try {
        const text = await file.text();
        done(text.startsWith(BOM) ? text.slice(1) : text);
      } catch {
        done(null);
      }
    };
    input.oncancel = () => done(null);
    input.click();
  });
}
