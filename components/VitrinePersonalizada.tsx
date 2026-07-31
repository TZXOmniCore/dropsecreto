'use client';

import { useEffect, useState } from 'react';
import type { Produto } from '@/lib/types';
import { ProdutoGrid } from './ProdutoGrid';
import { grupoPreferido } from '@/lib/category-behavior';
import { grupoDaCategoria } from '@/lib/category-clusters';

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Recebe um pool maior (ex.: os 30 melhores por Drop Score, não só 12) e
// decide os 12 exibidos no navegador da pessoa:
// - varia a cada recarregamento (sorteio novo a cada montagem do
//   componente, que é o que acontece toda vez que a página carrega);
// - se a pessoa tem um grupo de categoria dominante no histórico de
//   cliques, esse grupo ganha mais espaço na amostra (sem virar 100% dele
//   — mantém variedade real, só dá "mais ênfase", como foi pedido).
export function VitrinePersonalizada({ pool, quantidade = 12 }: { pool: Produto[]; quantidade?: number }) {
  // Primeira renderização usa os top N originais (igual ao servidor, evita
  // mismatch de hidratação); depois de montar, troca pela seleção
  // personalizada/embaralhada.
  const [selecionados, setSelecionados] = useState(() => pool.slice(0, quantidade));

  useEffect(() => {
    const grupo = grupoPreferido();

    if (!grupo) {
      setSelecionados(embaralhar(pool).slice(0, quantidade));
      return;
    }

    const doGrupo = pool.filter((p) => grupoDaCategoria(p.categoriaSlug) === grupo);
    const resto = pool.filter((p) => grupoDaCategoria(p.categoriaSlug) !== grupo);

    // Até 2/3 da vitrine pro grupo preferido, o resto pra manter variedade
    // (evita o feed virar só um nicho e nunca mais mostrar nada diferente).
    const quantosDoGrupo = Math.min(doGrupo.length, Math.ceil((quantidade * 2) / 3));
    const selecao = [
      ...embaralhar(doGrupo).slice(0, quantosDoGrupo),
      ...embaralhar(resto).slice(0, quantidade - quantosDoGrupo),
    ];

    setSelecionados(embaralhar(selecao));
  }, [pool, quantidade]);

  return <ProdutoGrid produtos={selecionados} />;
}
