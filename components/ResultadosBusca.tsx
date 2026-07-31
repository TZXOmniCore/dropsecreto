'use client';

import { useEffect, useState } from 'react';
import type { Produto } from '@/lib/types';
import { ProdutoGrid } from './ProdutoGrid';
import { grupoPreferido } from '@/lib/category-behavior';
import { grupoDaCategoria } from '@/lib/category-clusters';

// Reordenação client-side, por cima dos resultados já buscados no
// servidor (mantém SEO/SSR intactos): se a pessoa tem um grupo temático
// dominante no histórico de cliques (ex.: entrou bastante em produto de
// Tecnologia), os resultados desse grupo sobem pro topo — dentro de cada
// bloco, a relevância original é preservada (sort é estável).
export function ResultadosBusca({ produtos }: { produtos: Produto[] }) {
  const [ordenados, setOrdenados] = useState(produtos);

  useEffect(() => {
    const grupo = grupoPreferido();
    if (!grupo) {
      setOrdenados(produtos);
      return;
    }
    const comAfinidade = [...produtos].sort((a, b) => {
      const aCombina = grupoDaCategoria(a.categoriaSlug) === grupo ? 0 : 1;
      const bCombina = grupoDaCategoria(b.categoriaSlug) === grupo ? 0 : 1;
      return aCombina - bCombina;
    });
    setOrdenados(comAfinidade);
  }, [produtos]);

  return <ProdutoGrid produtos={ordenados} />;
}
