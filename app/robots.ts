import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Convenção do Next.js — gera /robots.txt sozinho. Bloqueia só a busca
// interna (não faz sentido indexar "/busca?q=..." — é conteúdo duplicado
// de outras páginas) e libera o resto.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/busca'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
