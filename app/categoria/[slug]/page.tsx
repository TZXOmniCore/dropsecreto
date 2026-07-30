import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductCard } from '@/components/ProductCard';
import { FiltroExplicado } from '@/components/FiltroExplicado';
import { buscarCategorias, buscarProdutosPorCategoria } from '@/lib/produtos';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const categorias = await buscarCategorias();
  const categoria = categorias.find((c) => c.slug === params.slug);
  if (!categoria) return { title: 'Categoria não encontrada — Drop Secreto' };

  return {
    title: `${categoria.nome} — ofertas verificadas | Drop Secreto`,
    description: `Ofertas de ${categoria.nome} aprovadas pelo Drop Score — preço, avaliação, vendas e histórico já checados.`,
  };
}

export default async function CategoriaPage({ params }: { params: { slug: string } }) {
  const categorias = await buscarCategorias();
  const categoria = categorias.find((c) => c.slug === params.slug);
  if (!categoria) notFound();

  const produtos = await buscarProdutosPorCategoria(categoria.slug);

  return (
    <main>
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs text-ink-secondary">
          <a href="/" className="hover:text-ink-primary">
            Início
          </a>{' '}
          / {categoria.nome}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-primary">{categoria.nome}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {produtos.length} {produtos.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
        </p>

        <CategoryChips categorias={categorias} />

        <FiltroExplicado />

        {produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhuma oferta aprovada nesta categoria no momento. Volte mais tarde.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
