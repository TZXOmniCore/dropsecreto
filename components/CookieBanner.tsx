'use client';

import { useEffect, useState } from 'react';
import { Cookie } from 'lucide-react';
import { lerConsentimento, salvarConsentimento, aoReabrirBanner } from '@/lib/cookie-consent';

// Aparece na primeira visita (antes de qualquer escolha salva) e também
// quando reaberto pelo link "Cookies" no rodapé. Enquanto ele estiver na
// tela sem escolha feita, o Analytics (GA/Clarity) não carrega — ver
// components/Analytics.tsx.
export function CookieBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (lerConsentimento() === null) setVisivel(true);
    return aoReabrirBanner(() => setVisivel(true));
  }, []);

  function escolher(valor: 'aceito' | 'recusado') {
    salvarConsentimento(valor);
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="glass fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 p-5 shadow-glow sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-md sm:rounded-2xl"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <p className="text-sm text-ink-secondary">
          Usamos cookies opcionais de programas de analytics só pra entender como o site é
          usado. Eles só são ativados se você aceitar — o site funciona normalmente se você
          recusar. Veja detalhes na{' '}
          <a href="/privacidade" className="text-accent underline underline-offset-2">
            política de privacidade
          </a>
          .
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => escolher('recusado')}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => escolher('aceito')}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
