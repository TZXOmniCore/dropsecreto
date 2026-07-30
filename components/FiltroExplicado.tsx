import Link from 'next/link';

// Legenda curta que aparece direto em cima de cada listagem de produto.
//
// Crítica que motivou isso: a análise externa sobre o site apontou que a
// interface "esconde" o diferencial (o critério de aprovação) atrás de um
// link pequeno pra outra página, obrigando quem só quer ver o produto a
// sair do fluxo pra entender o porquê daquele desconto ser confiável.
// Aqui a gente resume o critério na própria listagem — sem mostrar o
// número do score (que continua interno, só na página /como-funciona).
export function FiltroExplicado() {
  return (
    <p className="mb-4 text-xs text-ink-secondary">
      Só aparece aqui quem passa no filtro de preço (comparado ao histórico do produto), avaliação, vendas e
      confiabilidade da loja —{' '}
      <Link href="/como-funciona" className="text-accent transition-opacity hover:opacity-80">
        como funciona
      </Link>
      .
    </p>
  );
}
