import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Convenção do Next.js — gera /robots.txt sozinho. Bloqueia a busca
// interna (não faz sentido indexar "/busca?q=..." — é conteúdo duplicado
// de outras páginas) e o redirecionador de afiliado /go/ (não é
// conteúdo, é só o link que manda pra Shopee) e libera o resto.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/busca', '/go/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
