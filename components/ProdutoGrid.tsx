'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import type { Produto } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { obterModoVisualizacao, salvarModoVisualizacao, type ModoVisualizacao } from '@/lib/view-mode';

// Substitui a marcação de grid que estava repetida em 7 páginas
// (home, /produtos, /categoria, /produto, /favoritos, /busca) e
// acrescenta o alternador grade/lista pedido — a escolha fica salva por
// aparelho, sem precisar de login.
export function ProdutoGrid({
  produtos,
  mostrarAlternador = true,
}: {
  readonly produtos: Produto[];
  readonly mostrarAlternador?: boolean;
}) {
  const [modo, setModo] = useState<ModoVisualizacao>('grade');

  useEffect(() => {
    setModo(obterModoVisualizacao());
  }, []);

  function alternar(novoModo: ModoVisualizacao) {
    setModo(novoModo);
    salvarModoVisualizacao(novoModo);
  }

  return (
    <div>
      {mostrarAlternador && (
        <div className="mb-3 flex justify-end gap-1">
          <button
            type="button"
            onClick={() => alternar('grade')}
            aria-label="Ver em grade"
            aria-pressed={modo === 'grade'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              modo === 'grade'
                ? 'border-accent/50 text-accent'
                : 'border-line text-ink-faint hover:text-ink-secondary'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => alternar('lista')}
            aria-label="Ver em lista"
            aria-pressed={modo === 'lista'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              modo === 'lista'
                ? 'border-accent/50 text-accent'
                : 'border-line text-ink-faint hover:text-ink-secondary'
            }`}
          >
            <Rows3 className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={
          modo === 'grade'
            ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'
            : 'flex flex-col gap-3'
        }
      >
        {produtos.map((p) => (
          <ProductCard key={p.id} produto={p} layout={modo} />
        ))}
      </div>
    </div>
  );
}
