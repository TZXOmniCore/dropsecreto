import type { Metadata } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Três papéis tipográficos deliberados:
// - display: título com personalidade, usado com moderação
// - body: texto corrido, legível em telas escuras
// - mono: todo número (preço, score, contagem regressiva) — sinaliza "isso foi
//   calculado", reforçando a proposta do produto de que os dados são verificados
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Drop Secreto — Radar Inteligente de Ofertas',
  description:
    'Todo produto aqui passou por uma análise automática de preço, avaliação, vendas e histórico. O resto, a gente descarta.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
