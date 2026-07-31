'use client';

import { useEffect } from 'react';
import { registrarVisitaProduto } from '@/lib/category-behavior';

// Sem nada visual — só dispara o registro de afinidade de categoria ao
// entrar na página do produto (sinal mais forte que clicar num chip: a
// pessoa efetivamente abriu um produto daquele nicho). Fica num
// componente client à parte porque a página de produto em si é server
// component (precisa continuar assim pro SEO/metadata funcionar).
export function RegistrarClique({ categoriaSlug }: { categoriaSlug: string }) {
  useEffect(() => {
    registrarVisitaProduto(categoriaSlug);
  }, [categoriaSlug]);

  return null;
}
