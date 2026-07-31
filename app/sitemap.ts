import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { buscarCategorias, buscarTodosPorScorePaginado } from '@/lib/produtos';

// Convenção do Next.js — gera /sitemap.xml sozinho, sem precisar escrever
// XML na mão. Ajuda o Google a achar e indexar as páginas de produto e
// categoria mais rápido, sem custar nada (é tráfego orgânico).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasFixas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/produtos`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/categorias`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/melhores-da-semana`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ranking`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/como-funciona`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/sobre-nos`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: 'monthly', priority: 0.2 },
  ];

  const categorias = await buscarCategorias();
  const paginasCategoria: MetadataRoute.Sitemap = categorias.map((c) => ({
    url: `${SITE_URL}/categoria/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Limite alto o bastante pra cobrir o catálogo aprovado sem virar um
  // sitemap gigante demais — Google recomenda até 50 mil URLs por arquivo,
  // bem longe daqui.
  const { produtos } = await buscarTodosPorScorePaginado(1, 500);
  const paginasProduto: MetadataRoute.Sitemap = produtos.map((p) => ({
    url: `${SITE_URL}/produto/${p.id}`,
    lastModified: p.atualizadoEm,
    changeFrequency: 'daily',
    priority: 0.5,
  }));

  return [...paginasFixas, ...paginasCategoria, ...paginasProduto];
}
