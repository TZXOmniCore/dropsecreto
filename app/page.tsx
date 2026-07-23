import { Navbar } from '@/components/Navbar';
import { ScannerHero } from '@/components/ScannerHero';
import { TrustBar } from '@/components/TrustBar';
import { HowItWorks } from '@/components/HowItWorks';
import { CategoryChips } from '@/components/CategoryChips';
import { ProductCard } from '@/components/ProductCard';
import { FlashDeals } from '@/components/FlashDeals';
import { RankingList } from '@/components/RankingList';
import { Footer } from '@/components/Footer';
import { CATEGORIAS, PRODUTOS_MOCK, FLASH_DEALS, RANKING_DO_DIA } from '@/lib/mock-data';

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <ScannerHero />
      <TrustBar />
      <HowItWorks />

      <div className="mx-auto max-w-7xl px-6">
        <CategoryChips categorias={CATEGORIAS} />

        <section id="ofertas" className="py-6">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Top Ofertas</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PRODUTOS_MOCK.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        </section>

        <section className="py-6">
          <FlashDeals produtos={FLASH_DEALS} />
        </section>

        <section className="grid gap-10 py-6 md:grid-cols-[2fr,1fr]">
          <div>
            <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">
              Últimas quedas de preço
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {PRODUTOS_MOCK.slice(0, 3).map((p) => (
                <ProductCard key={p.id} produto={p} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-5 font-display text-xl font-bold text-ink-primary">Ranking do Dia</h2>
            <RankingList produtos={RANKING_DO_DIA} />
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
