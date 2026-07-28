// Reordenação "silenciosa" dos chips de categoria com base no que a
// própria pessoa clica no navegador dela — a ideia da análise externa era
// exatamente essa: se os primeiros cliques forem em monitor/notebook/gamer,
// a interface deveria ir empurrando beleza/pets pro fundo sozinha, sem
// precisar de login nem conta.
//
// Fica tudo em localStorage, local ao navegador de quem visita — não é
// enviado pra lugar nenhum, então não tem custo de servidor nem depende de
// login (o site continua sem exigir conta).
const CHAVE = 'drop-secreto:categorias-clicadas';

export function registrarCliqueCategoria(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    const contagens = obterContagens();
    contagens[slug] = (contagens[slug] ?? 0) + 1;
    window.localStorage.setItem(CHAVE, JSON.stringify(contagens));
  } catch {
    // localStorage indisponível (aba anônima etc.) — segue sem quebrar nada
  }
}

export function obterContagens(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : {};
  } catch {
    return {};
  }
}

// Categoria mais clicada vem primeiro; entre as que empatam (inclui as
// nunca clicadas), mantém a ordem original — Array.sort é estável.
export function ordenarPorComportamento<T extends { slug: string }>(categorias: T[]): T[] {
  const contagens = obterContagens();
  return [...categorias].sort((a, b) => (contagens[b.slug] ?? 0) - (contagens[a.slug] ?? 0));
}
