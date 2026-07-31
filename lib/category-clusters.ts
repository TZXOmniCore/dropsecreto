// Agrupamento temático das categorias — usado só na página /categorias.
//
// Crítica que motivou isso: uma análise externa sobre o site apontou que a
// lista de categorias pula sem aviso de nichos de tecnologia (celulares,
// SSD, RAM...) pra casa, cozinha, beleza, moda, carro, pets — uma "parede"
// sem lógica visual que sobrecarrega quem está navegando (paradoxo da
// escolha). Agrupar por tema deixa a lista escaneável sem esconder nenhuma
// categoria.
//
// Categoria nova que vier da importação da Shopee e não estiver mapeada
// aqui cai automaticamente no grupo "Outras" — nada quebra, só fica sem
// agrupamento fino até alguém adicionar o slug no mapa abaixo.
import type { Categoria } from './types';

export interface GrupoCategorias {
  titulo: string;
  categorias: Categoria[];
}

const MAPA_GRUPOS: Record<string, string> = {
  celulares: 'Tecnologia',
  informatica: 'Tecnologia',
  ssd: 'Tecnologia',
  'memoria-ram': 'Tecnologia',
  notebook: 'Tecnologia',
  monitor: 'Tecnologia',
  gamer: 'Tecnologia',
  'smart-home': 'Tecnologia',
  casa: 'Casa & Cozinha',
  cozinha: 'Casa & Cozinha',
  ferramentas: 'Casa & Cozinha',
  moda: 'Moda & Beleza',
  beleza: 'Moda & Beleza',
  carro: 'Automotivo',
  pets: 'Família & Pets',
  criancas: 'Família & Pets',
};

// Slugs de cada grupo, na ordem que faz mais sentido pra "encher" uma
// vitrine daquele nicho (usado pela personalização em lib/category-behavior.ts).
export const SLUGS_POR_GRUPO: Record<string, string[]> = Object.entries(MAPA_GRUPOS).reduce(
  (acc, [slug, grupo]) => {
    (acc[grupo] ??= []).push(slug);
    return acc;
  },
  {} as Record<string, string[]>
);

export function grupoDaCategoria(slug: string): string {
  return MAPA_GRUPOS[slug] ?? 'Outras';
}

// Ordem fixa de exibição — não depende da ordem que veio do banco, e
// "Outras" sempre fica por último.
const ORDEM_GRUPOS = [
  'Tecnologia',
  'Casa & Cozinha',
  'Moda & Beleza',
  'Família & Pets',
  'Automotivo',
  'Outras',
];

export function agruparCategorias(categorias: Categoria[]): GrupoCategorias[] {
  const porGrupo = new Map<string, Categoria[]>();

  for (const categoria of categorias) {
    const grupo = MAPA_GRUPOS[categoria.slug] ?? 'Outras';
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
    porGrupo.get(grupo)!.push(categoria);
  }

  return ORDEM_GRUPOS.filter((grupo) => porGrupo.has(grupo)).map((titulo) => ({
    titulo,
    categorias: porGrupo.get(titulo)!,
  }));
}
