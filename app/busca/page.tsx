import { Navbar } from '@/components/Navbar';
import { ResultadosBusca } from '@/components/ResultadosBusca';
import { FiltrosBarra } from '@/components/FiltrosBarra';
import { Footer } from '@/components/Footer';
import { buscarProdutosPorNome, type FiltrosProdutos } from '@/lib/produtos';

export const metadata = {
  title: 'Buscar — Drop Secreto',
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: { q?: string; ordenar?: string; desconto?: string; precoMin?: string; precoMax?: string };
}) {
  const termo = searchParams.q?.trim() ?? '';
  const filtros: FiltrosProdutos = {
    ordenar: (searchParams.ordenar as FiltrosProdutos['ordenar']) || 'relevancia',
    descontoMinimo: Number(searchParams.desconto) || undefined,
    precoMin: searchParams.precoMin ? Number(searchParams.precoMin) : undefined,
    precoMax: searchParams.precoMax ? Number(searchParams.precoMax) : undefined,
  };
  const produtos = termo ? await buscarProdutosPorNome(termo, filtros) : [];

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          {termo ? (
            <>
              Resultados pra <span className="text-accent">"{termo}"</span>
            </>
          ) : (
            'Buscar'
          )}
        </h1>

        {!termo ? (
          <p className="mt-4 text-sm text-ink-secondary">Digite algo na busca lá em cima.</p>
        ) : (
          <>
            <div className="mt-6">
              <FiltrosBarra />
            </div>

            {produtos.length === 0 ? (
              <div className="glass mt-2 rounded-2xl p-10 text-center text-sm text-ink-secondary">
                Nenhum produto aprovado encontrado pra "{termo}".
              </div>
            ) : (
              <ResultadosBusca produtos={produtos} />
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
