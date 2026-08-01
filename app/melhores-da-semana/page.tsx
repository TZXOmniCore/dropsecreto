import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProdutoGrid } from '@/components/ProdutoGrid';
import { buscarMelhoresDaSemana } from '@/lib/produtos';

export const revalidate = 3600; // gerada de novo a cada hora

export const metadata = {
  title: 'Melhores ofertas da semana — Drop Secreto',
  description:
    'As ofertas com melhor Drop Score verificadas nos últimos 7 dias — preço, avaliação, vendas e histórico já checados.',
  alternates: { canonical: '/melhores-da-semana' },
};

// Página gerada sozinha a partir do próprio banco, sem ninguém escrever
// nada manualmente toda semana — existe pra virar uma porta de entrada
// indexável pelo Google (tráfego orgânico, sem custar nada).
export default async function MelhoresDaSemanaPage() {
  const produtos = await buscarMelhoresDaSemana(24);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">
          Melhores ofertas da semana
        </h1>
        <p className="mt-2 text-sm text-ink-secondary">
          As ofertas com melhor Drop Score verificadas nos últimos 7 dias, atualizada
          automaticamente.
        </p>

        {produtos.length === 0 ? (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-sm text-ink-secondary">
            Ainda sem ofertas verificadas nos últimos 7 dias — volte em breve.
          </div>
        ) : (
          <div className="mt-8">
            <ProdutoGrid produtos={produtos} />
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
