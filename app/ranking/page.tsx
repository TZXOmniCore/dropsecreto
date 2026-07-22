import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RankingList } from '@/components/RankingList';
import { PRODUTOS_MOCK } from '@/lib/mock-data';

export default function RankingPage() {
  const ranking = [...PRODUTOS_MOCK].sort((a, b) => b.dropScore - a.dropScore);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Ranking do Dia</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Os produtos com maior Drop Score de hoje, do melhor para o pior.
        </p>
        <div className="mt-8">
          <RankingList produtos={ranking} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
