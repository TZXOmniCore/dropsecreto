import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ScannerHero } from '@/components/ScannerHero';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductCard } from '@/components/ProductCard';
import { FlashDeals } from '@/components/FlashDeals';
import { RankingList } from '@/components/RankingList';
import { Footer } from '@/components/Footer';
// "Como o Drop Score funciona" agora é uma página própria em /como-funciona
// (link no botão secundário do ScannerHero) — não mora mais aqui na home.
import {
  buscarCategorias,
  buscarTopOfertas,
  buscarFlashDeals,
  buscarUltimasQuedas,
  buscarTop3MaioresDescontos,
} from '@/lib/produtos';

export const revalidate = 60; // atualiza a home a cada 60s

export default async function HomePage() {
  const [categorias, topOfertas, flashDeals, ultimasQuedas, top3Descontos] =
    await Promise.all([
      buscarCategorias(),
      buscarTopOfertas(12),
      buscarFlashDeals(4),
      buscarUltimasQuedas(3),
      buscarTop3MaioresDescontos(),
    ]);

  return (
    <main>
      <Navbar />
      <ScannerHero top3={top3Descontos} />

      <div className="mx-auto max-w-7xl px-6">
        <CategoryChips categorias={categorias} />

        <section id="ofertas" className="py-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink-primary">Top Ofertas</h2>
            <Link
              href="/produtos"
              className="shrink-0 text-sm text-accent transition-opacity hover:opacity-80"
            >
              Ver todos →
            </Link>
          </div>
          {topOfertas.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-ink-secondary">
              Nenhuma oferta aprovada ainda. O Motor de Drop Score está analisando os produtos
              importados — volte daqui a pouco.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {topOfertas.map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>
          )}
        </section>

        {flashDeals.length > 0 && (
          <section className="py-6">
            <FlashDeals produtos={flashDeals} />
          </section>
        )}

        {ultimasQuedas.length > 0 && (
          <section className="py-6">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">
              Últimas quedas de preço
            </h2>
            <RankingList produtos={ultimasQuedas} variante="desconto" truncarNomeMobile />
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
