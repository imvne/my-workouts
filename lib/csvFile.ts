// Fichier réel (.csv) — web uniquement ; sur natif on garde copier/coller.
import { Platform } from 'react-native';

export const canUseFiles = Platform.OS === 'web' && typeof document !== 'undefined';

export function downloadCsv(text: string, filename = 'ma-prog.csv') {
  if (!canUseFiles) return;
  // BOM pour qu'Excel/Numbers lisent les accents en UTF-8.
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
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
    input.accept = '.csv,text/csv,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      resolve(text.replace(/^﻿/, ''));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
