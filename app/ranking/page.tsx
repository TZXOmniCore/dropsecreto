import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RankingList } from '@/components/RankingList';
import { buscarRankingDoDia } from '@/lib/produtos';

export const revalidate = 60;

export default async function RankingPage() {
  const ranking = await buscarRankingDoDia(50);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Ranking do Dia</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Os produtos com maior Drop Score de hoje, do melhor para o pior.
        </p>
        <div className="mt-8">
          {ranking.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-ink-secondary">
              Ainda não há produtos aprovados pra montar o ranking de hoje.
            </div>
          ) : (
            <RankingList produtos={ranking} />
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
