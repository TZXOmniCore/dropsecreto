// Reordenação "silenciosa" dos chips de categoria com base no que a
// própria pessoa clica no navegador dela — a ideia da análise externa era
// exatamente essa: se os primeiros cliques forem em monitor/notebook/gamer,
// a interface deveria ir empurrando beleza/pets pro fundo sozinha, sem
// precisar de login nem conta.
//
// Fica tudo em localStorage, local ao navegador de quem visita — não é
// enviado pra lugar nenhum, então não tem custo de servidor nem depende de
// login (o site continua sem exigir conta).
import { grupoDaCategoria } from './category-clusters';

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

// Registra também que a pessoa "entrou" num produto de uma categoria —
// sinal mais forte que clicar num chip (é o caso descrito na análise:
// pesquisou/abriu um teclado gamer, então o site deveria dar mais ênfase
// a gabinete/ventoinha/monitor/placa de vídeo depois disso). Chamado em
// components/RegistrarClique.tsx na página do produto.
export function registrarVisitaProduto(categoriaSlug: string) {
  if (!categoriaSlug) return;
  registrarCliqueCategoria(categoriaSlug);
}

// Grupo temático (Tecnologia, Casa & Cozinha, Moda & Beleza...) com mais
// cliques acumulados — usado pra dar mais ênfase a esse nicho tanto na
// vitrine da home quanto na ordenação da busca. Retorna null se a pessoa
// ainda não tem nenhum clique registrado (evita "personalizar" em cima
// de nada, o que só ficaria aleatório disfarçado de inteligente).
export function grupoPreferido(): string | null {
  const contagens = obterContagens();
  const porGrupo = new Map<string, number>();

  for (const [slug, vezes] of Object.entries(contagens)) {
    const grupo = grupoDaCategoria(slug);
    porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + vezes);
  }

  let melhorGrupo: string | null = null;
  let melhorContagem = 0;
  for (const [grupo, total] of porGrupo) {
    if (total > melhorContagem) {
      melhorContagem = total;
      melhorGrupo = grupo;
    }
  }
  return melhorGrupo;
}
