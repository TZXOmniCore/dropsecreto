import { Navbar } from '@/components/Navbar';
import { ScannerHero } from '@/components/ScannerHero';
import { TrustBar } from '@/components/TrustBar';
import { HowItWorks } from '@/components/HowItWorks';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductCard } from '@/components/ProductCard';
import { FlashDeals } from '@/components/FlashDeals';
import { RankingList } from '@/components/RankingList';
import { Footer } from '@/components/Footer';
import {
  buscarCategorias,
  buscarTopOfertas,
  buscarFlashDeals,
  buscarUltimasQuedas,
  buscarRankingDoDia,
} from '@/lib/produtos';

export const revalidate = 60; // atualiza a home a cada 60s

export default async function HomePage() {
  const [categorias, topOfertas, flashDeals, ultimasQuedas, ranking] = await Promise.all([
    buscarCategorias(),
    buscarTopOfertas(12),
    buscarFlashDeals(4),
    buscarUltimasQuedas(3),
    buscarRankingDoDia(10),
  ]);

  return (
    <main>
      <Navbar />
      <ScannerHero />
      <TrustBar />
      <HowItWorks />

      <div className="mx-auto max-w-7xl px-6">
        <CategoryChips categorias={categorias} />

        <section id="ofertas" className="py-6">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Top Ofertas</h2>
          {topOfertas.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-ink-secondary">
              Nenhuma oferta aprovada ainda. O Motor de Drop Score está analisando os produtos
              importados — volte daqui a pouco.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

        {(ultimasQuedas.length > 0 || ranking.length > 0) && (
          <section className="grid gap-10 py-6 md:grid-cols-[2fr,1fr]">
            {ultimasQuedas.length > 0 && (
              <div>
                <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">
                  Últimas quedas de preço
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {ultimasQuedas.map((p) => (
                    <ProductCard key={p.id} produto={p} />
                  ))}
                </div>
              </div>
            )}

            {ranking.length > 0 && (
              <div>
                <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Ranking do Dia</h2>
                <RankingList produtos={ranking} />
              </div>
            )}
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
