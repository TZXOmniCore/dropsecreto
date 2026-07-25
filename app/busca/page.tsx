import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';
import { buscarProdutosPorNome } from '@/lib/produtos';

export const metadata = {
  title: 'Buscar — Drop Secreto',
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const termo = searchParams.q?.trim() ?? '';
  const produtos = termo ? await buscarProdutosPorNome(termo) : [];

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          {termo ? (
            <>
              Resultados pra <span className="text-accent">"{termo}"</span>
            </>
          ) : (
            'Buscar'
          )}
        </h1>

        {!termo ? (
          <p className="mt-4 text-sm text-ink-secondary">Digite algo na busca lá em cima.</p>
        ) : produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhum produto aprovado encontrado pra "{termo}".
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
