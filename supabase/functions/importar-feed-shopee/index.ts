// ============================================================
// DROP SECRETO — Importador do Feed Oficial da Shopee
// Busca ofertas via Shopee Affiliate Open API (GraphQL) e grava
// os produtos como "pendente" para o Motor de Drop Score analisar depois.
// Pensado para rodar como Supabase Edge Function (Deno/TypeScript).
//
// CORREÇÕES NESTA VERSÃO:
// 1) PAGINAÇÃO: a query não pedia "pageInfo" e o contador de página
//    começava em 0. A doc da Shopee mostra "page" com padrão 1 — com
//    page=0 a API provavelmente sempre devolvia a página 1, por isso
//    vinha sempre o mesmo lote. Corrigido: page começa em 1 e agora lemos
//    pageInfo{page,limit,hasNextPage} pra saber de verdade quando parar.
// 2) PROGRESSO ENTRE EXECUÇÕES: o Supabase corta a função em 150s (vale
//    pro free E pro pago — é o "request idle timeout"), então não dá pra
//    trazer o catálogo inteiro numa chamada só. Agora a função salva em
//    qual página parou (tabela import_estado, SQL no final) e a próxima
//    execução continua dali. Ao chegar no fim do feed, volta pra página 1
//    (o upsert por shopee_item_id evita duplicar).
// 3) PARALELIZAÇÃO: busca de nota de loja nova (shopOfferV2) e gravação
//    de produtos agora rodam em paralelo (até 8 por vez), não mais um de
//    cada vez — isso é o que mais pesava no tempo total.
// 4) CATEGORIA: o productOfferV2 NÃO tem parâmetro de categoria (não dá
//    pra filtrar por nicho nessa API) — o "categoria_id" aqui é só rótulo
//    de navegação do site, não influencia aprovação (isso é 100% do
//    drop-score-engine, por confiabilidade). Mapeamento de exemplo agora
//    cobre todos os seus nichos, não só tecnologia.
//
// IMPORTANTE — confirme antes de usar em produção:
// 1) productCatIds reais da sua conta ainda precisam ser preenchidos no
//    MAPEAMENTO_CATEGORIAS — rode uma importação, veja nos logs quais
//    productCatIds aparecem em "categoria sem mapeamento" e complete.
// 2) LOG_AMOSTRA_PRECO imprime os valores brutos dos primeiros produtos
//    de cada execução pra confirmar que priceMin já vem em reais normais.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Folga confortável antes do teto de 150s (request idle timeout do
// Supabase, vale pros dois planos) — a função sempre retorna limpa em
// vez de ser cortada no meio.
const ORCAMENTO_MS = 100_000;

const LOG_AMOSTRA_PRECO = 3;

// Mapeamento Shopee categoryId -> slug interno do Drop Secreto.
// ⚠️ VALORES DE EXEMPLO — substitua pelos IDs reais da sua conta/região.
// A Shopee não expõe endpoint de "lista de categorias"; o jeito prático é
// rodar a importação, ver nos logs quais productCatIds aparecem em
// "categoria sem mapeamento" e completar aqui. Cobre TODOS os seus
// nichos — o site é multi-categoria por definição, não só tecnologia.
const MAPEAMENTO_CATEGORIAS: Record<number, string> = {
  // 100001: 'celulares',
  // 100002: 'informatica',
  // 100003: 'ssd',
  // 100004: 'memoria-ram',
  // 100005: 'notebook',
  // 100006: 'monitor',
  // 100007: 'gamer',
  // 100008: 'ferramentas',
  // 100009: 'casa',
  // 100010: 'cozinha',
  // 100011: 'beleza',
  // 100012: 'moda',
  // 100013: 'carro',
  // 100014: 'pets',
  // 100015: 'criancas',
  // 100016: 'smart-home',
};

interface ShopeeOfferNode {
  itemId: number;
  productName: string;
  imageUrl: string;
  priceMin: string;
  priceMax: string;
  priceDiscountRate: number;
  sales: number;
  ratingStar: string;
  commissionRate: string;
  commission: string;
  productLink: string;
  offerLink: string;
  productCatIds: number[];
  shopId: number;
  shopName: string;
  shopType: number[];
}

interface PageInfo {
  page: number;
  limit: number;
  hasNextPage: boolean;
}

// ------------------------------------------------------------
// Assinatura HMAC-SHA256 exigida pela Shopee Affiliate Open API
// ------------------------------------------------------------
async function assinarRequisicao(payload: string): Promise<HeadersInit> {
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${SHOPEE_APP_ID}${timestamp}${payload}${SHOPEE_SECRET}`;

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(base));
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    'Content-Type': 'application/json',
    Authorization: `SHA256 Credential=${SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`,
  };
}

async function chamarGraphQL(query: string, variables: Record<string, unknown>): Promise<any> {
  const payload = JSON.stringify({ query, variables });
  const headers = await assinarRequisicao(payload);

  const resposta = await fetch(SHOPEE_GRAPHQL_URL, { method: 'POST', headers, body: payload });
  const dados = await resposta.json();

  if (dados.errors) {
    throw new Error(`Erro na API da Shopee: ${JSON.stringify(dados.errors)}`);
  }

  return dados.data;
}

// ------------------------------------------------------------
// Roda uma lista de itens com no máximo `limite` chamadas simultâneas —
// evita disparar dezenas de requisições de uma vez pra Shopee/Supabase.
// ------------------------------------------------------------
async function mapComLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function worker() {
    while (proximo < itens.length) {
      const indiceAtual = proximo++;
      resultados[indiceAtual] = await fn(itens[indiceAtual], indiceAtual);
    }
  }

  const workers = Array.from({ length: Math.min(limite, itens.length) }, () => worker());
  await Promise.all(workers);
  return resultados;
}

// ------------------------------------------------------------
// Busca uma página de ofertas via productOfferV2 — agora pedindo
// pageInfo pra saber de verdade se tem próxima página.
// ------------------------------------------------------------
async function buscarPaginaDeOfertas(
  page: number,
  limit: number
): Promise<{ nodes: ShopeeOfferNode[]; pageInfo: PageInfo | null }> {
  const query = `
    query Fetch($page: Int, $limit: Int) {
      productOfferV2(listType: 0, sortType: 2, page: $page, limit: $limit) {
        nodes {
          itemId
          productName
          imageUrl
          priceMin
          priceMax
          priceDiscountRate
          sales
          ratingStar
          commissionRate
          commission
          productLink
          offerLink
          productCatIds
          shopId
          shopName
          shopType
        }
        pageInfo {
          page
          limit
          hasNextPage
        }
      }
    }
  `;

  const dados = await chamarGraphQL(query, { page, limit });
  return {
    nodes: dados?.productOfferV2?.nodes ?? [],
    pageInfo: dados?.productOfferV2?.pageInfo ?? null,
  };
}

const cacheNotaLoja = new Map<number, number | null>();

async function buscarNotaLoja(shopId: number): Promise<number | null> {
  if (cacheNotaLoja.has(shopId)) return cacheNotaLoja.get(shopId)!;

  try {
    const query = `
      query FetchShop($shopId: Int64) {
        shopOfferV2(shopId: $shopId, limit: 1) {
          nodes { shopId ratingStar }
        }
      }
    `;
    const dados = await chamarGraphQL(query, { shopId });
    const nota = parseFloat(dados?.shopOfferV2?.nodes?.[0]?.ratingStar) || null;
    cacheNotaLoja.set(shopId, nota);
    return nota;
  } catch (erro) {
    console.error(`Erro ao buscar nota da loja ${shopId}:`, erro);
    cacheNotaLoja.set(shopId, null);
    return null;
  }
}

function calcularPrecoAntigoAproximado(precoAtual: number, descontoPercentual: number): number | null {
  if (!descontoPercentual || descontoPercentual <= 0) return null;
  return Math.round((precoAtual / (1 - descontoPercentual / 100)) * 100) / 100;
}

function resolverCategoriaSlug(productCatIds: number[]): string | null {
  for (const catId of productCatIds ?? []) {
    const slug = MAPEAMENTO_CATEGORIAS[catId];
    if (slug) return slug;
  }
  if (productCatIds?.length) {
    console.warn('Categoria sem mapeamento — productCatIds:', productCatIds);
  }
  return null;
}

// ------------------------------------------------------------
// Resolve (busca ou cria) a loja de UM shopId. Chamada em paralelo, uma
// vez por loja única do lote — nunca duas vezes pro mesmo shopId no
// mesmo lote, então não corre risco de duplicar linha.
// ------------------------------------------------------------
async function garantirLoja(
  supabase: any,
  shopId: number,
  shopName: string,
  shopOficial: boolean
): Promise<string | null> {
  const notaLoja = await buscarNotaLoja(shopId);

  const { data: existente } = await supabase
    .from('lojas')
    .select('id')
    .eq('shopee_shop_id', shopId)
    .maybeSingle();

  const dadosLoja = {
    nome: shopName || `Loja Shopee ${shopId}`,
    shopee_shop_id: shopId,
    loja_oficial: shopOficial,
    avaliacao_media: notaLoja,
    confiabilidade_score: 50, // ajustado manualmente por enquanto; ver drop-score-engine
  };

  if (existente) {
    await supabase.from('lojas').update(dadosLoja).eq('id', existente.id);
    return existente.id;
  }

  const { data: nova } = await supabase.from('lojas').insert(dadosLoja).select('id').single();
  return nova?.id ?? null;
}

// ------------------------------------------------------------
// Processa um lote: resolve as lojas únicas em paralelo primeiro, depois
// grava todos os produtos em paralelo (já com o loja_id em mãos).
// ------------------------------------------------------------
async function importarLote(
  supabase: any,
  nodes: ShopeeOfferNode[],
  categoriasIdPorSlug: Record<string, string>
): Promise<number> {
  if (nodes.length === 0) return 0;

  const lojasUnicas = new Map<number, { shopName: string; shopOficial: boolean }>();
  for (const node of nodes) {
    if (!lojasUnicas.has(node.shopId)) {
      lojasUnicas.set(node.shopId, {
        shopName: node.shopName,
        shopOficial: node.shopType?.includes(1) ?? false,
      });
    }
  }

  const lojaIdPorShopId = new Map<number, string | null>();
  await mapComLimite(Array.from(lojasUnicas.entries()), 8, async ([shopId, info]) => {
    const lojaId = await garantirLoja(supabase, shopId, info.shopName, info.shopOficial);
    lojaIdPorShopId.set(shopId, lojaId);
  });

  await mapComLimite(nodes, 8, async (node, indice) => {
    const precoAtual = parseFloat(node.priceMin);
    const precoAntigo = calcularPrecoAntigoAproximado(precoAtual, node.priceDiscountRate);

    if (indice < LOG_AMOSTRA_PRECO) {
      console.log('Amostra de preço bruto da Shopee:', {
        itemId: node.itemId,
        priceMin: node.priceMin,
        priceMax: node.priceMax,
        priceDiscountRate: node.priceDiscountRate,
        precoAtualCalculado: precoAtual,
        precoAntigoCalculado: precoAntigo,
      });
    }

    const categoriaSlug = resolverCategoriaSlug(node.productCatIds);
    const categoriaId = categoriaSlug ? categoriasIdPorSlug[categoriaSlug] ?? null : null;

    await supabase.from('produtos').upsert(
      {
        shopee_item_id: node.itemId,
        nome: node.productName,
        loja_id: lojaIdPorShopId.get(node.shopId) ?? null,
        categoria_id: categoriaId,
        imagem_principal_url: node.imageUrl,
        preco_atual: precoAtual,
        preco_antigo: precoAntigo,
        avaliacao: parseFloat(node.ratingStar) || 0,
        quantidade_vendida: node.sales,
        link_afiliado: node.offerLink,
        link_original: node.productLink,
        status: 'pendente', // o Motor de Drop Score decide aprovar/rejeitar depois
      },
      { onConflict: 'shopee_item_id' }
    );
  });

  return nodes.length;
}

// ------------------------------------------------------------
// Lê/grava em qual página a próxima execução deve continuar.
// Precisa da tabela import_estado — SQL logo depois do código.
// ------------------------------------------------------------
async function lerProximaPagina(supabase: any): Promise<number> {
  const { data } = await supabase
    .from('import_estado')
    .select('proxima_pagina')
    .eq('id', 1)
    .maybeSingle();
  return data?.proxima_pagina ?? 1;
}

async function salvarProximaPagina(supabase: any, pagina: number) {
  await supabase
    .from('import_estado')
    .upsert({ id: 1, proxima_pagina: pagina, atualizado_em: new Date().toISOString() });
}

// ------------------------------------------------------------
// Handler principal da Edge Function
// Deploy: supabase functions deploy importar-feed-shopee
// ------------------------------------------------------------
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const inicioMs = Date.now();
  const inicio = new Date(inicioMs).toISOString();

  let totalImportados = 0;
  let pagina = 1;
  let paginasProcessadas = 0;
  const LIMITE_POR_PAGINA = 50;

  try {
    const { data: categorias } = await supabase.from('categorias').select('id, slug');
    const categoriasIdPorSlug: Record<string, string> = Object.fromEntries(
      (categorias ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
    );

    pagina = await lerProximaPagina(supabase);

    while (Date.now() - inicioMs < ORCAMENTO_MS) {
      const { nodes, pageInfo } = await buscarPaginaDeOfertas(pagina, LIMITE_POR_PAGINA);

      if (nodes.length === 0) {
        pagina = 1; // fim do feed — recomeça do início na próxima execução
        break;
      }

      totalImportados += await importarLote(supabase, nodes, categoriasIdPorSlug);
      paginasProcessadas++;

      const temProximaPagina = pageInfo?.hasNextPage ?? nodes.length === LIMITE_POR_PAGINA;
      if (!temProximaPagina) {
        pagina = 1;
        break;
      }

      pagina = (pageInfo?.page ?? pagina) + 1;
    }

    await salvarProximaPagina(supabase, pagina);

    await supabase.from('logs_importacao').insert({
      fonte: 'shopee_feed',
      produtos_importados: totalImportados,
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, importados: totalImportados, paginasProcessadas, proximaPagina: pagina }),
      { status: 200 }
    );
  } catch (erro) {
    await supabase.from('logs_importacao').insert({
      fonte: 'shopee_feed',
      produtos_importados: totalImportados,
      erro: String(erro),
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: false, erro: String(erro) }), { status: 500 });
  }
});
