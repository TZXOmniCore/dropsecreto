'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function VoltarAoTopo() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function aoRolar() {
      setVisivel(window.scrollY > 600);
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  if (!visivel) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Voltar ao topo"
      className="glass fixed bottom-6 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full shadow-card transition-opacity hover:opacity-90"
    >
      <ArrowUp className="h-5 w-5 text-ink-primary" />
    </button>
  );
}
