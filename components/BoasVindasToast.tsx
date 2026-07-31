'use client';

import { useEffect, useState } from 'react';
import { X, Radar } from 'lucide-react';

const CHAVE = 'drop-secreto:viu-boas-vindas';

// Some sozinho depois de uns segundos ou se a pessoa fechar — não é
// popup bloqueando a tela, só um toque explicando o Drop Score pra quem
// chega pela primeira vez. Só aparece uma vez por aparelho.
export function BoasVindasToast() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CHAVE)) return;
    } catch {
      return;
    }
    const entrar = setTimeout(() => setVisivel(true), 1200);
    return () => clearTimeout(entrar);
  }, []);

  function fechar() {
    setVisivel(false);
    try {
      window.localStorage.setItem(CHAVE, '1');
    } catch {
      // localStorage indisponível — sem problema, só aparece de novo na próxima visita
    }
  }

  useEffect(() => {
    if (!visivel) return;
    const some = setTimeout(fechar, 8000);
    return () => clearTimeout(some);
  }, [visivel]);

  if (!visivel) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-30 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 sm:left-6 sm:translate-x-0">
      <div className="glass flex items-start gap-3 rounded-2xl p-4 shadow-card">
        <Radar className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-ink-secondary">
          Todo produto aqui passa por um filtro automático (Drop Score) antes de aparecer — preço
          comparado ao histórico, avaliação, vendas e mais.{' '}
          <a href="/como-funciona" className="text-accent underline-offset-2 hover:underline">
            Ver como funciona
          </a>
        </p>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="shrink-0 text-ink-faint hover:text-ink-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
