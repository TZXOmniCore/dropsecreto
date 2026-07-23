const CRITERIOS = [
  { peso: '20%', nome: 'Desconto real', descricao: 'Compara o preço "de" declarado com o desconto de fato.' },
  { peso: '20%', nome: 'Histórico de preço', descricao: 'Cruza com os últimos 90 dias — se o preço "de" nunca existiu, o produto cai no score.' },
  { peso: '15%', nome: 'Avaliação', descricao: 'Nota dos compradores, ponderada pela quantidade de avaliações.' },
  { peso: '15%', nome: 'Vendas', descricao: 'Quantidade vendida — produto sem histórico de venda pontua baixo.' },
  { peso: '15%', nome: 'Confiabilidade da loja', descricao: 'Loja oficial e com bom histórico pontua mais; loja suspeita é rejeitada na hora.' },
  { peso: '8%', nome: 'Frete', descricao: 'Frete grátis pontua o máximo; frete caro em relação ao preço pontua menos.' },
  { peso: '7%', nome: 'Cupom', descricao: 'Produto com cupom ativo no momento da análise ganha um bônus.' },
] as const;

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-line py-16">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="font-display text-2xl font-bold text-ink-primary">
          Como o Drop Score funciona
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink-secondary">
          Todo produto recebe uma nota de 0 a 100. Abaixo de 50, ele é descartado
          automaticamente e nunca aparece no site.
        </p>

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
