'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // instalação de PWA é um "bônus" — se falhar, o site continua
        // funcionando normalmente, só sem o prompt de instalar.
      });
    }
  }, []);

  return null;
}
