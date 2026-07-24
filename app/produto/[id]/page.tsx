import { notFound } from 'next/navigation';
import { Star, Truck, Store, ShoppingCart } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { PriceHistoryChart } from '@/components/PriceHistoryChart';
import { buscarProdutoPorId, buscarSemelhantes } from '@/lib/produtos';

export const revalidate = 60;

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function ProdutoPage({ params }: { params: { id: string } }) {
  const produto = await buscarProdutoPorId(params.id);
  if (!produto) notFound();

  const semelhantes = await buscarSemelhantes(produto.categoriaSlug, produto.id, 4);

  const economiaReais = produto.precoAntigo ? produto.precoAntigo - produto.precoAtual : 0;
  const economiaPercentual = produto.precoAntigo
    ? Math.round((economiaReais / produto.precoAntigo) * 100)
    : 0;

  return (
    <main>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="glass overflow-hidden rounded-2xl">
            <img src={produto.imagemUrl} alt={produto.nome} className="aspect-square w-full object-cover" />
          </div>

          <div className="flex flex-col">
            <span
              className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium mono-num ${
                produto.classificacao === 'Excelente'
                  ? 'border-accent/40 bg-accent/15 text-accent'
                  : produto.classificacao === 'Boa'
                  ? 'border-accent/20 bg-accent/8 text-accent/90'
                  : 'border-line bg-ink-secondary/10 text-ink-secondary'
              }`}
            >
              {produto.dropScore} score · {produto.classificacao}
            </span>

            <h1 className="mt-3 font-display text-2xl font-bold text-ink-primary">{produto.nome}</h1>

            <div className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
              <Store className="h-4 w-4" />
              {produto.lojaNome}
              {produto.lojaOficial && (
                <span className="rounded-full border border-line px-2 py-0.5 text-xs">loja oficial</span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1 text-sm text-ink-secondary">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="mono-num text-ink-primary">{produto.avaliacao}</span>
              <span className="mono-num">· {produto.quantidadeVendida.toLocaleString('pt-BR')} vendidos</span>
            </div>

            <div className="mt-6 flex items-baseline gap-3">
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

            <a href={produto.linkAfiliado}
              className="mt-8 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90"
            >
              <ShoppingCart className="h-4 w-4" />
              Comprar na loja
            </a>
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              Você será redirecionado para a loja. Como afiliados, podemos receber comissão.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <PriceHistoryChart dados={produto.historico90d} />
        </div>

        {semelhantes.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Produtos semelhantes</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {semelhantes.map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Comentários</h2>
          <div className="glass rounded-2xl p-8 text-center text-sm text-ink-secondary">
            Ainda não há comentários para este produto.
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
