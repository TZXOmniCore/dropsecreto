import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { PwaRegister } from '@/components/PwaRegister';
import { Analytics } from '@/components/Analytics';
import { VoltarAoTopo } from '@/components/VoltarAoTopo';
import { BoasVindasToast } from '@/components/BoasVindasToast';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Três papéis tipográficos deliberados:
// - display: título com personalidade, usado com moderação
// - body: texto corrido, legível em telas escuras
// - mono: todo número (preço, score, contagem regressiva) — sinaliza "isso foi NOSONAR
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

const TITULO_PADRAO = 'Drop Secreto — Radar Inteligente de Ofertas';
const DESCRICAO_PADRAO =
  'Todo produto aqui passou por uma análise automática de preço, avaliação, vendas e histórico. O resto, a gente descarta.';

export const metadata: Metadata = {
  // Faz todo link relativo em openGraph.images / alternates.canonical NOSONAR
  // (aqui e nas páginas filhas) virar URL absoluta automaticamente.
  metadataBase: new URL(SITE_URL),
  title: TITULO_PADRAO,
  description: DESCRICAO_PADRAO,
  alternates: { canonical: '/' },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'Drop Secreto',
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO_PADRAO,
    description: DESCRICAO_PADRAO,
    images: ['/icon-512.png'],
  },
  // Cola aqui o código de verificação do Google Search Console (Propriedade
  // -> Verificação -> tag HTML -> só o valor do content="...") como variável
  // de ambiente na Vercel. Sem essa variável, a tag simplesmente não é
  // gerada — não fica um placeholder quebrado no ar.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// display: 'standalone' (no manifest.json) + isto aqui é o que faz o site
// poder ser instalado como app no celular e no desktop.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0B',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {children}
        <PwaRegister />
        <Analytics />
        <VoltarAoTopo />
        <BoasVindasToast />
      </body>
    </html>
  );
}
