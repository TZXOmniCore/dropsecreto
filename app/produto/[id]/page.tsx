import type { Metadata } from 'next';
import Image from 'next/image';
import { Star, Truck, Store, AlertTriangle, CheckCircle2, SearchX, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { FavoritarButton } from '@/components/FavoritarButton';
import { CompartilharBotao } from '@/components/CompartilharBotao';
import { BotaoComprar } from '@/components/BotaoComprar';
import { RegistrarClique } from '@/components/RegistrarClique';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { AlertaProdutoInline } from '@/components/AlertaProdutoInline';
import { buscarProdutoPorId, buscarSemelhantes, buscarTopOfertas } from '@/lib/produtos';
import { produtoPoucoVendido } from '@/lib/produto-badges';
import { tempoRelativo } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

export const revalidate = 60;

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const produto = await buscarProdutoPorId(params.id);
  if (!produto) {
    return { title: 'Produto não encontrado — Drop Secreto' };
  }
  const desconto = produto.precoAntigo
    ? Math.round(((produto.precoAntigo - produto.precoAtual) / produto.precoAntigo) * 100)
    : 0;
  return {
    title: `${produto.nome} — ${formatarPreco(produto.precoAtual)} | Drop Secreto`,
    description: `${produto.nome} por ${formatarPreco(produto.precoAtual)}${
      desconto > 0 ? ` (${desconto}% de desconto)` : ''
    } na ${produto.lojaNome}. Analisado pelo Drop Score antes de aparecer aqui.`,
    openGraph: { images: [produto.imagemUrl] },
  };
}

export default async function ProdutoPage({ params }: { params: { id: string } }) {
  const produto = await buscarProdutoPorId(params.id);

  if (!produto) {
    const sugestoes = await buscarTopOfertas(8);
    return (
      <main>
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <SearchX className="mx-auto h-10 w-10 text-ink-faint" />
          <h1 className="mt-4 font-display text-xl font-bold text-ink-primary">
            Esse produto não está mais disponível
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
            Ele pode ter saído do ar na Shopee, ficado sem estoque, ou parado de passar no Drop
            Score. Mas tem bastante oferta boa esperando você:
          </p>
          {sugestoes.length > 0 && (
            <div className="mt-10 grid grid-cols-2 gap-2.5 text-left sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {sugestoes.map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>
          )}
        </div>
        <Footer />
      </main>
    );
  }

  const semelhantes = await buscarSemelhantes(produto.categoriaSlug, produto.id, 4);

  const economiaReais = produto.precoAntigo ? produto.precoAntigo - produto.precoAtual : 0;
  const economiaPercentual = produto.precoAntigo
    ? Math.round((economiaReais / produto.precoAntigo) * 100)
    : 0;
  const ePoucoVendido = produtoPoucoVendido(produto);

  // "Por que isso passou" — substitui o número cru do Drop Score por sinais
  // concretos e verificáveis (o score continua existindo por dentro, só não
  // aparece mais como número na página do produto).
  const sinaisDeConfianca = [
    produto.lojaOficial && 'loja oficial',
    produto.promocaoVerificada === true && 'desconto confirmado com histórico de preço',
    produto.avaliacao > 0 && `nota ${produto.avaliacao.toFixed(1)}`,
  ].filter(Boolean) as string[];

  return (
    <main>
      <Navbar />
      <RegistrarClique categoriaSlug={produto.categoriaSlug} />

      {/* Dados estruturados pro Google poder mostrar preço/nota direto no
          resultado de busca, sem custar nada — só é dado, sem tráfego pago. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: produto.nome,
            image: produto.imagemUrl,
            offers: {
              '@type': 'Offer',
              url: `${SITE_URL}/produto/${produto.id}`,
              priceCurrency: 'BRL',
              price: produto.precoAtual,
              availability: 'https://schema.org/InStock',
            },
            ...(produto.avaliacao > 0
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: produto.avaliacao,
                    reviewCount: Math.max(produto.quantidadeVendida, 1),
                  },
                }
              : {}),
          }),
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="glass relative aspect-square overflow-hidden rounded-2xl">
            <Image src={produto.imagemUrl} alt={produto.nome} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
          </div>

          <div className="flex min-w-0 flex-col">
            {sinaisDeConfianca.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sinaisDeConfianca.map((sinal) => (
                  <span
                    key={sinal}
                    className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {sinal}
                  </span>
                ))}
              </div>
            )}

            {ePoucoVendido && (
              <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                poucas vendas registradas até agora
              </span>
            )}

            <h1 className="mt-3 font-display text-2xl font-bold text-ink-primary">{produto.nome}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
              <Store className="h-4 w-4 shrink-0" />
              <span className="truncate">{produto.lojaNome}</span>
              {produto.lojaOficial && (
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs">
                  loja oficial
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1 text-sm text-ink-secondary">
              <Star className="h-4 w-4 shrink-0 fill-accent text-accent" />
              <span className="mono-num text-ink-primary">{produto.avaliacao}</span>
              <span className="mono-num">· {produto.quantidadeVendida.toLocaleString('pt-BR')} vendidos</span>
            </div>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="mono-num text-3xl font-bold text-ink-primary">
                {formatarPreco(produto.precoAtual)}
              </span>
              {produto.precoAntigo && (
                <span className="mono-num text-sm text-ink-faint line-through">
                  {formatarPreco(produto.precoAntigo)}
                </span>
              )}
            </div>

            {economiaReais > 0 && (
              <p className="mt-1 text-sm text-accent">
                economize <span className="mono-num">{formatarPreco(economiaReais)}</span> (
                <span className="mono-num">{economiaPercentual}%</span>)
              </p>
            )}

            <p className="mt-1 text-[11px] text-ink-faint">
              verificado {tempoRelativo(produto.atualizadoEm)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-secondary">
              <span className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1">
                <Truck className="h-3.5 w-3.5" />
                {produto.freteGratis ? 'frete grátis' : 'frete a calcular'}
              </span>
              {produto.temCupom && (
                <span className="rounded-full border border-accent/30 px-2.5 py-1 text-accent/90">
                  cupom disponível
                </span>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <BotaoComprar
                produtoId={produto.id}
                produtoNome={produto.nome}
              />
              <FavoritarButton produtoId={produto.id} />
              <CompartilharBotao
                produtoId={produto.id}
                nomeProduto={produto.nome}
                precoFormatado={formatarPreco(produto.precoAtual)}
                url={`${SITE_URL}/produto/${produto.id}`}
              />
            </div>
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              Você será redirecionado para a loja. Como afiliados, podemos receber comissão.
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-faint">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Confie, mas confirme: o preço final é o que aparecer na loja no momento da compra.
            </p>

            <AlertaProdutoInline nomeProduto={produto.nome} precoAtual={produto.precoAtual} />
          </div>
        </div>

        <div className="mt-12">
          <PriceHistoryChart dados={produto.historico90d} />
        </div>

        {semelhantes.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Produtos semelhantes</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {semelhantes.map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
