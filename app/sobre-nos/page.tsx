import Link from 'next/link';
import { Radar, Target, Gem, Eye } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Sobre nós — Drop Secreto',
  alternates: { canonical: '/sobre-nos' },
};

const PRINCIPIOS = [
  {
    icone: Radar,
    titulo: 'Rastreio contínuo',
    texto: 'O catálogo é reavaliado o tempo todo, então o ranking mostra sempre as ofertas mais atuais — não uma foto antiga do preço.',
  },
  {
    icone: Target,
    titulo: 'Foco no que você procura',
    texto: 'Busca e ranking dão mais destaque pro tipo de produto que você mais navega, pra encontrar rápido o que interessa.',
  },
  {
    icone: Gem,
    titulo: 'As melhores em primeiro',
    texto: 'O Drop Score ordena pela qualidade real da oferta — desconto, avaliação, histórico e confiabilidade da loja — não por quem paga mais pra aparecer.',
  },
  {
    icone: Eye,
    titulo: 'Como ganhamos dinheiro',
    texto: 'Somos afiliados: podemos ganhar uma comissão quando você compra por aqui, sem custo extra pra você. Isso não muda a posição de ninguém no ranking.',
  },
];

export default function SobreNosPage() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-ink-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> quem somos
        </span>

        <h1 className="font-display text-2xl font-bold text-ink-primary sm:text-3xl">
          Sobre nós
        </h1>

        <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-ink-secondary">
          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              O que é o Drop Secreto
            </h2>
            <p className="mt-2">
              O Drop Secreto é uma plataforma que encontra e ranqueia as melhores ofertas do
              momento, em qualquer categoria — de celular a produto de cozinha. A missão é simples:
              reunir num só lugar as ofertas que realmente valem a pena, organizadas por um
              ranking automático, pra você não precisar vasculhar loja por loja atrás do melhor
              preço.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Como surgiu
            </h2>
            <p className="mt-2">
              A ideia nasceu de um problema bem prático: achar a melhor oferta de um produto
              específico dá trabalho — são várias lojas, vários preços e vários descontos
              diferentes pro mesmo item, espalhados por vários lugares. O Drop Secreto surgiu pra
              resolver isso, automatizando essa comparação e organizando tudo num ranking único,
              atualizado o tempo todo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Pra que serve
            </h2>
            <p className="mt-2">
              É simples: você entra no site, olha o ranking e já vê as melhores ofertas do
              momento — ou busca direto o produto que já tem em mente e confere se ele está em
              promoção agora. Sem abrir dez abas, sem entrar em grupo de desconto, sem passar
              horas comparando preço manualmente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Como garantimos que são as melhores ofertas
            </h2>
            <p className="mt-2">
              Cada oferta que entra no ranking passa pelo Drop Score, o motor que analisa desconto
              real, histórico de preço, avaliação e confiabilidade da loja. É esse motor que decide
              a posição de cada produto — sempre pelo mesmo critério, em qualquer categoria do
              catálogo.
            </p>
            <p className="mt-2">
              <Link
                href="/como-funciona"
                className="text-accent underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
              >
                Ver como o Drop Score funciona, critério por critério →
              </Link>
            </p>
          </section>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PRINCIPIOS.map((p) => (
            <div key={p.titulo} className="glass rounded-2xl p-5">
              <p.icone className="h-5 w-5 text-accent" />
              <h3 className="mt-2 text-sm font-medium text-ink-primary">{p.titulo}</h3>
              <p className="mt-1.5 text-xs text-ink-secondary">{p.texto}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-line pt-6 text-sm text-ink-secondary">
          <p>
            Achou uma oferta estranha ou tem uma sugestão? Usa o botão de feedback aqui embaixo —
            a gente lê tudo. Pra entender como tratamos seus dados e os termos de uso do site,
            veja{' '}
            <Link
              href="/privacidade"
              className="text-accent underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
            >
              privacidade e termos
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
