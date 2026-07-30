import {
  PESOS,
  LIMIAR_NOTA_LOJA,
  LIMIAR_NOTA_PRODUTO,
  LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO,
} from '../supabase/functions/_shared/drop-score-engine';

// Os textos abaixo (nome/descrição) são fixos, mas o peso (%) vem direto de
// PESOS no motor de score — muda o peso lá, muda aqui sozinho, sem precisar
// editar dois lugares.
const DESCRICOES: Record<keyof typeof PESOS, { nome: string; descricao: string }> = {
  desconto: {
    nome: 'Desconto real',
    descricao: 'Compara o preço "de" declarado com o desconto de fato.',
  },
  historicoPreco: {
    nome: 'Histórico de preço',
    descricao: 'Cruza com o histórico acumulado do produto — se o preço "de" nunca existiu, o produto cai no score.',
  },
  avaliacao: {
    nome: 'Avaliação',
    descricao: 'Nota dos compradores no produto.',
  },
  vendas: {
    nome: 'Vendas',
    descricao: 'Quantidade vendida — pesa na posição do ranking, mas produto sem venda ainda não é descartado por causa disso.',
  },
  loja: {
    nome: 'Confiabilidade da loja',
    descricao: 'Loja oficial e com bom histórico pontua mais; loja suspeita é rejeitada na hora.',
  },
  frete: {
    nome: 'Frete',
    descricao: 'Frete grátis pontua o máximo; frete caro em relação ao preço pontua menos.',
  },
  cupom: {
    nome: 'Cupom',
    descricao: 'Produto com cupom ativo no momento da análise ganha um bônus.',
  },
};

const CRITERIOS = (Object.keys(PESOS) as (keyof typeof PESOS)[]).map((chave) => ({
  peso: `${Math.round(PESOS[chave] * 100)}%`,
  ...DESCRICOES[chave],
}));

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-line py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-ink-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          motor de análise ativo
        </span>

        <h2 className="font-display text-2xl font-bold text-ink-primary">
          Como o Drop Score funciona
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink-secondary">
          Todo produto disponível na Shopee é avaliado. O Drop Score (0 a 100) mede o quão boa é a
          oferta e decide a posição no ranking — mas quem decide se o produto aparece ou não no
          site é a nota:
        </p>
        <ul className="mt-3 max-w-xl list-disc space-y-1 pl-5 text-sm text-ink-secondary">
          <li>Loja com nota abaixo de {LIMIAR_NOTA_LOJA} estrelas nunca aparece.</li>
          <li>Produto com nota abaixo de {LIMIAR_NOTA_PRODUTO} estrelas é descartado.</li>
          <li>
            Produto ainda sem nenhuma avaliação (comum em item novo ou pouco vendido) só passa se a
            loja tiver nota {LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO}+ — do contrário, ele espera até
            ter avaliação própria.
          </li>
        </ul>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRITERIOS.map((c) => (
            <div key={c.nome} className="glass rounded-2xl p-5">
              <span className="mono-num text-sm text-accent">{c.peso}</span>
              <h3 className="mt-1 text-sm font-medium text-ink-primary">{c.nome}</h3>
              <p className="mt-1.5 text-xs text-ink-secondary">{c.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
