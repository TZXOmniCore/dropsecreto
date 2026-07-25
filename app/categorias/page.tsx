import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { buscarCategorias } from '@/lib/produtos';

export const revalidate = 60;

export const metadata = {
  title: 'Categorias — Drop Secreto',
};

export default async function CategoriasPage() {
  const categorias = await buscarCategorias();

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Categorias</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Só aparecem aqui categorias que já têm pelo menos uma oferta aprovada pelo Drop Score.
        </p>

        {categorias.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Nenhuma categoria com oferta aprovada ainda.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="glass flex flex-col gap-1 rounded-2xl p-5 shadow-card transition-transform hover:-translate-y-0.5 hover:border-accent/30"
              >
                <span className="text-sm font-medium text-ink-primary">{c.nome}</span>
                <span className="mono-num text-xs text-ink-secondary">
                  {c.quantidadeProdutos ?? 0} {c.quantidadeProdutos === 1 ? 'oferta' : 'ofertas'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
