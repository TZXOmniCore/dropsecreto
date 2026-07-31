import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ScannerHero } from '@/components/ScannerHero';
import { CategoryChips } from '@/components/CategoryChips';
import { VitrinePersonalizada } from '@/components/VitrinePersonalizada';
import { CarrosselOfertas } from '@/components/CarrosselOfertas';
import { FlashDeals } from '@/components/FlashDeals';
import { FiltroExplicado } from '@/components/FiltroExplicado';
import { ContadorAprovados } from '@/components/ContadorAprovados';
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
  const [categorias, poolTopOfertas, flashDeals, ultimasQuedas, top3Descontos] =
    await Promise.all([
      buscarCategorias(),
      // Pool maior (não só os 12 exibidos) — o VitrinePersonalizada sorteia
      // e personaliza em cima disso no navegador da pessoa, então cada
      // recarregamento mostra uma seleção diferente sem perder qualidade
      // (continua tudo vindo dos melhores por Drop Score).
      buscarTopOfertas(36),
      buscarFlashDeals(4),
      buscarUltimasQuedas(8),
      buscarTop3MaioresDescontos(),
    ]);

  return (
    <main>
      <Navbar />
      <ScannerHero top3={top3Descontos} />

      <div className="mx-auto max-w-7xl px-6">
        <CategoryChips categorias={categorias} />

        <section id="ofertas" className="py-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink-primary">Top Ofertas</h2>
            <Link
              href="/produtos"
              className="shrink-0 text-sm text-accent transition-opacity hover:opacity-80"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mb-3">
            <ContadorAprovados />
          </div>
          <FiltroExplicado />
          {poolTopOfertas.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-ink-secondary">
              Nenhuma oferta aprovada ainda. O Motor de Drop Score está analisando os produtos
              importados — volte daqui a pouco.
            </div>
          ) : (
            <div className="mt-4">
              <VitrinePersonalizada pool={poolTopOfertas} quantidade={12} />
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
            <CarrosselOfertas produtos={ultimasQuedas} />
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
