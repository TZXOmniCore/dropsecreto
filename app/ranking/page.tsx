import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RankingList } from '@/components/RankingList';
import { FiltroExplicado } from '@/components/FiltroExplicado';
import { buscarRankingPorDesconto } from '@/lib/produtos';

export const revalidate = 60;

export const metadata = {
  title: 'Ranking de ofertas — Drop Secreto',
  description: 'Ranking do dia e do mês por maior desconto entre os produtos aprovados pelo Drop Score.',
  alternates: { canonical: '/ranking' },
};

const ABAS = [
  { periodo: 'dia' as const, rotulo: 'Ranking do Dia' },
  { periodo: 'mes' as const, rotulo: 'Ranking do Mês' },
];

export default async function RankingPage({
  searchParams,
}: {
  readonly searchParams: { readonly periodo?: string };
}) {
  const periodo = searchParams.periodo === 'mes' ? 'mes' : 'dia';
  const ranking = await buscarRankingPorDesconto(periodo, 50);
  const tituloAtual = ABAS.find((a) => a.periodo === periodo)!.rotulo;

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">{tituloAtual}</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Os produtos com maior desconto, do melhor pro pior.
          {periodo === 'mes' && ' Considera só quem teve o preço checado nos últimos 30 dias.'}
        </p>

        <div className="mt-6 flex gap-2">
          {ABAS.map((a) => (
            <Link
              key={a.periodo}
              href={a.periodo === 'dia' ? '/ranking' : '/ranking?periodo=mes'}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                periodo === a.periodo
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {a.rotulo}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <FiltroExplicado />
        </div>

        <div className="mt-8">
          {ranking.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-ink-secondary">
              Ainda não há produtos aprovados pra montar esse ranking.
            </div>
          ) : (
            <RankingList produtos={ranking} variante="desconto" />
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
