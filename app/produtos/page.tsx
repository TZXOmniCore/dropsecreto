import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { FiltroExplicado } from '@/components/FiltroExplicado';
import { Footer } from '@/components/Footer';
import { buscarTodosPorScorePaginado } from '@/lib/produtos';

export const revalidate = 60;

export const metadata = {
  title: 'Todos os produtos — Drop Secreto',
  description: 'Todos os produtos aprovados pelo Drop Score, ordenados do mais relevante pro menos relevante.',
};

export default async function TodosProdutosPage({
  searchParams,
}: {
  searchParams: { pagina?: string };
}) {
  const paginaAtual = Math.max(1, Number(searchParams.pagina) || 1);
  const { produtos, total, totalPaginas } = await buscarTodosPorScorePaginado(paginaAtual);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Todos os produtos</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {total > 0
            ? `${total} produtos aprovados, do mais relevante pro menos relevante.`
            : 'Ordenados do mais relevante pro menos relevante.'}
        </p>

        <div className="mt-4">
          <FiltroExplicado />
        </div>

        {produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhuma oferta aprovada ainda.
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {produtos.map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Link
                  href={`/produtos?pagina=${Math.max(1, paginaAtual - 1)}`}
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
                  href={`/produtos?pagina=${Math.min(totalPaginas, paginaAtual + 1)}`}
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
