import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ProdutoGrid } from '@/components/ProdutoGrid';
import { FiltrosBarra } from '@/components/FiltrosBarra';
import { FiltroExplicado } from '@/components/FiltroExplicado';
import { Footer } from '@/components/Footer';
import { buscarProdutosFiltrados, type FiltrosProdutos } from '@/lib/produtos';

export const revalidate = 60;

export const metadata = {
  title: 'Todos os produtos — Drop Secreto',
  description: 'Todos os produtos aprovados pelo Drop Score, ordenados do mais relevante pro menos relevante.',
  alternates: { canonical: '/produtos' },
};

export default async function TodosProdutosPage({
  searchParams,
}: {
  searchParams: { pagina?: string; ordenar?: string; desconto?: string; precoMin?: string; precoMax?: string };
}) {
  const paginaAtual = Math.max(1, Number(searchParams.pagina) || 1);
  const filtros: FiltrosProdutos = {
    pagina: paginaAtual,
    ordenar: (searchParams.ordenar as FiltrosProdutos['ordenar']) || 'relevancia',
    descontoMinimo: Number(searchParams.desconto) || undefined,
    precoMin: searchParams.precoMin ? Number(searchParams.precoMin) : undefined,
    precoMax: searchParams.precoMax ? Number(searchParams.precoMax) : undefined,
  };
  const { produtos, total, totalPaginas } = await buscarProdutosFiltrados(filtros);

  function comFiltros(pagina: number) {
    const params = new URLSearchParams();
    if (searchParams.ordenar) params.set('ordenar', searchParams.ordenar);
    if (searchParams.desconto) params.set('desconto', searchParams.desconto);
    if (searchParams.precoMin) params.set('precoMin', searchParams.precoMin);
    if (searchParams.precoMax) params.set('precoMax', searchParams.precoMax);
    params.set('pagina', String(pagina));
    return `/produtos?${params.toString()}`;
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Todos os produtos</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {total > 0
            ? `${total} produtos aprovados encontrados.`
            : 'Ordenados do mais relevante pro menos relevante.'}
        </p>

        <div className="mt-4">
          <FiltroExplicado />
        </div>

        <div className="mt-6">
          <FiltrosBarra />
        </div>

        {produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhuma oferta encontrada com esses filtros.
          </div>
        ) : (
          <>
            <ProdutoGrid produtos={produtos} />

            {totalPaginas > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Link
                  href={comFiltros(Math.max(1, paginaAtual - 1))}
                  aria-disabled={paginaAtual <= 1}
                  className={`rounded-full border border-line px-4 py-2 text-sm transition-colors ${
                    paginaAtual <= 1
                      ? 'pointer-events-none opacity-40'
                      : 'text-ink-primary hover:border-accent/50'
                  }`}
                >
                  ← Anterior
                </Link>
                <span className="mono-num px-3 text-sm text-ink-secondary">
                  {paginaAtual} / {totalPaginas}
                </span>
                <Link
                  href={comFiltros(Math.min(totalPaginas, paginaAtual + 1))}
                  aria-disabled={paginaAtual >= totalPaginas}
                  className={`rounded-full border border-line px-4 py-2 text-sm transition-colors ${
                    paginaAtual >= totalPaginas
                      ? 'pointer-events-none opacity-40'
                      : 'text-ink-primary hover:border-accent/50'
                  }`}
                >
                  Próxima →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
