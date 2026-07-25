import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { Footer } from '@/components/Footer';
import { buscarTodosPorScore } from '@/lib/produtos';

export const revalidate = 60;

export const metadata = {
  title: 'Todos os produtos — Drop Secreto',
};

export default async function TodosProdutosPage() {
  const produtos = await buscarTodosPorScore(60);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Todos os produtos</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Ordenados pelo Drop Score, do maior pro menor. Essa ordem muda conforme o motor
          reavalia os produtos.
        </p>

        {produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhuma oferta aprovada ainda.
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
