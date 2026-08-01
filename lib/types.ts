export interface Produto {
  id: string;
  nome: string;
  imagemUrl: string;
  precoAtual: number;
  precoAntigo: number | null;
  dropScore: number;
  classificacao: 'Excelente' | 'Boa' | 'Regular' | 'Ruim';
  lojaNome: string;
  lojaOficial: boolean;
  freteGratis: boolean;
  temCupom: boolean;
  quantidadeVendida: number;
  avaliacao: number;
  categoriaSlug: string;
  historico90d: number[];
  historicoDiasCobertos: number;
  importadoEm: string;
  atualizadoEm: string;
  promocaoVerificada: boolean | null;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  quantidadeProdutos?: number;
}
