// Dispara eventos customizados pro Google Analytics — é o que dá
// visibilidade real de CTR/conversão/KPI (item 3 e 4 da lista), sem
// precisar construir nenhum painel próprio. Só funciona depois que
// NEXT_PUBLIC_GA_ID estiver configurado (ver components/Analytics.tsx);
// até lá, essas chamadas não fazem nada (nem dão erro).
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function registrarEvento(nome: string, parametros: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', nome, parametros);
}

// Eventos específicos já nomeados, pra manter consistência em vez de
// cada componente inventar um nome de evento diferente:
export const eventos = {
  cliqueOferta: (produtoId: string, produtoNome: string) =>
    registrarEvento('clique_oferta', { produto_id: produtoId, produto_nome: produtoNome }),
  compartilhar: (produtoId: string) => registrarEvento('compartilhar_oferta', { produto_id: produtoId }),
  favoritar: (produtoId: string, favoritado: boolean) =>
    registrarEvento(favoritado ? 'favoritar_oferta' : 'desfavoritar_oferta', { produto_id: produtoId }),
  buscar: (termo: string) => registrarEvento('busca', { termo }),
  filtrar: (filtro: string, valor: string) => registrarEvento('aplicar_filtro', { filtro, valor }),
};
