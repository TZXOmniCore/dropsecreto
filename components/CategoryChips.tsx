'use client';

import { useEffect, useState } from 'react';
import type { Categoria } from '@/lib/types';
import { ordenarPorComportamento, registrarCliqueCategoria } from '@/lib/category-behavior';

export function CategoryChips({ categorias }: { readonly categorias: Categoria[] }) {
  // Primeira renderização usa a ordem original (igual ao servidor, evita
  // mismatch de hidratação). Depois de montar no navegador, reordena com
  // base no histórico de cliques salvo — as categorias que a pessoa mais
  // visita vão silenciosamente pra frente da fila.
  const [ordenadas, setOrdenadas] = useState(categorias);

  useEffect(() => {
    setOrdenadas(ordenarPorComportamento(categorias));
  }, [categorias]);

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-6 py-5 md:px-0">
      {ordenadas.map((c) => (
        <a
          key={c.id}
          href={`/categoria/${c.slug}`}
          onClick={() => registrarCliqueCategoria(c.slug)}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink-secondary transition-colors hover:border-accent/50 hover:text-ink-primary"
        >
          {c.nome}
        </a>
      ))}
      {categorias.length > 0 && (
        <a
          href="/categorias"
          className="shrink-0 rounded-full border border-accent/30 px-4 py-2 text-sm text-accent transition-colors hover:border-accent/60"
        >
          Ver todas →
        </a>
      )}
    </div>
  );
}
