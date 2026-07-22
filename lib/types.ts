export interface Produto {
  id: string;
  nome: string;
  imagemUrl: string;
  precoAtual: number;
  precoAntigo: number | null;
  dropScore: number;
  classificacao: 'Excelente' | 'Boa' | 'Regular' | 'Ruim';
  lojaOficial: boolean;
  freteGratis: boolean;
  temCupom: boolean;
  quantidadeVendida: number;
  avaliacao: number;
  historico90d: number[]; // usado no mini-gráfico do card
  linkAfiliado: string;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
}
