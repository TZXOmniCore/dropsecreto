// ============================================================
// DROP SECRETO — Importador do Feed Oficial da Shopee
// Busca ofertas via Shopee Affiliate Open API (GraphQL) e grava
// os produtos como "pendente" para o Motor de Drop Score analisar depois.
// Pensado para rodar como Supabase Edge Function (Deno/TypeScript).
//
// IMPORTANTE — confirme antes de usar em produção:
// 1) O hostname exato do endpoint para o Brasil (aqui assumido como
//    open-api.affiliate.shopee.com.br/graphql, seguindo o padrão usado
//    por outros países — confirme no seu painel de afiliado).
// 2) O schema completo de productOfferV2/shopOfferV2 pode variar por
//    conta/região; valide os nomes de campo abaixo com uma chamada de
//    teste antes de rodar em produção.
// 3) MAPEAMENTO_CATEGORIAS abaixo está com valores de EXEMPLO — os IDs
//    reais de categoria da Shopee Brasil ainda precisam ser preenchidos.
//    Rode uma importação, veja nos logs os productCatIds que aparecerem
//    pra "categoria sem mapeamento", e complete a tabela.
// 4) Preço: nas amostras públicas que encontrei, priceMin/priceMax já
//    vêm em reais normais (ex.: "49.90"), não em centavos — mas os logs
//    abaixo (LOG_AMOSTRA_PRECO) imprimem os valores brutos dos primeiros
//    produtos de cada execução pra confirmar isso com dado real de vocês.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Quantos produtos por página têm o preço bruto impresso no log, só pra
// conferência manual (ver aviso 4 acima). Não afeta o que é gravado no banco.
const LOG_AMOSTRA_PRECO = 3;

// Mapeamento Shopee categoryId -> slug interno do Drop Secreto.
// ⚠️ VALORES DE EXEMPLO — substitua pelos IDs reais da sua conta/região.
// A Shopee não expõe um endpoint de "lista de categorias" na Affiliate
// Open API; o jeito prático é rodar a importação, olhar nos logs quais
// productCatIds aparecem em "categoria sem mapeamento" e completar aqui.
const MAPEAMENTO_CATEGORIAS: Record<number, string> = {
  // 100001: 'informatica',
  // 100002: 'perifericos',
  // 100003: 'casa-inteligente',
  // 100004: 'celulares',
  // 100005: 'audio',
  // 100006: 'games',
};

interface ShopeeOfferNode {
  itemId: number;
  productName: string;
  imageUrl: string;
  priceMin: string;
  priceMax: string;
  priceDiscountRate: number; // ex.: 10 = 10%
  sales: number;
  ratingStar: string;
  commissionRate: string;
  commission: string;
  productLink: string;
  offerLink: string;
  productCatIds: number[];
  shopId: number;
  shopName: string;
  shopType: number[]; // 1 = Mall/oficial, 2 = Preferred/Star, 4 = Preferred Plus/Star+
}

interface ShopeeShopOfferNode {
  shopId: number;
  ratingStar: string;
}

// ------------------------------------------------------------
// Assinatura HMAC-SHA256 exigida pela Shopee Affiliate Open API
// Header: Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}
// Signature = SHA256(AppId + Timestamp + Payload + Secret), timestamp em segundos Unix
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
// Busca uma página de ofertas via productOfferV2.
// shopId, shopName e shopType vêm de graça aqui — não precisam de uma
// chamada separada (só a nota da loja em si precisa, ver buscarNotaLoja).
// ------------------------------------------------------------
async function buscarPaginaDeOfertas(page: number, limit = 50): Promise<ShopeeOfferNode[]> {
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
      }
    }
  `;

  const dados = await chamarGraphQL(query, { page, limit });
  return dados?.productOfferV2?.nodes ?? [];
}

// ------------------------------------------------------------
// Nota da loja (ratingStar) só vem pelo shopOfferV2, filtrando por
// shopId — não vem no productOfferV2. Cacheado em memória durante a
// execução pra não repetir chamada pra loja que já apareceu antes no
// mesmo lote (várias ofertas costumam ser da mesma loja).
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// A API não expõe um campo direto de "preço antigo"; ele é
// aproximado a partir do preço atual e do percentual de desconto.
// ------------------------------------------------------------
function calcularPrecoAntigoAproximado(precoAtual: number, descontoPercentual: number): number | null {
  if (!descontoPercentual || descontoPercentual <= 0) return null;
  return Math.round((precoAtual / (1 - descontoPercentual / 100)) * 100) / 100;
}

// ------------------------------------------------------------
// Categoria interna a partir dos productCatIds da Shopee. Retorna o
// slug da primeira categoria da lista que tiver mapeamento conhecido.
// Se nenhuma bater, loga o(s) id(s) pra completar MAPEAMENTO_CATEGORIAS
// depois, e o produto fica sem categoria por enquanto (não trava a
// importação, só não aparece em nenhuma página de categoria).
// ------------------------------------------------------------
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
// Garante que a loja exista e mantém nome/tipo/nota em dia. shopId,
// shopName e shopType já vêm no próprio productOfferV2 (não precisam
// de chamada extra); só a nota (ratingStar) exige buscarNotaLoja.
// ------------------------------------------------------------
async function garantirLoja(supabase: any, node: ShopeeOfferNode): Promise<string | null> {
  const lojaOficial = node.shopType?.includes(1) ?? false;
  const notaLoja = await buscarNotaLoja(node.shopId);

  const { data: existente } = await supabase
    .from('lojas')
    .select('id')
    .eq('shopee_shop_id', node.shopId)
    .maybeSingle();

  const dadosLoja = {
    nome: node.shopName || `Loja Shopee ${node.shopId}`,
    shopee_shop_id: node.shopId,
    loja_oficial: lojaOficial,
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
// Processa um lote de nós e grava/atualiza em `produtos`
// ------------------------------------------------------------
async function importarLote(
  supabase: any,
  nodes: ShopeeOfferNode[],
  categoriasIdPorSlug: Record<string, string>
): Promise<number> {
  let importados = 0;

  for (const [indice, node] of nodes.entries()) {
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

    const lojaId = await garantirLoja(supabase, node);
    const categoriaSlug = resolverCategoriaSlug(node.productCatIds);
    const categoriaId = categoriaSlug ? categoriasIdPorSlug[categoriaSlug] ?? null : null;

    await supabase.from('produtos').upsert(
      {
        shopee_item_id: node.itemId,
        nome: node.productName,
        loja_id: lojaId,
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

    importados++;
  }

  return importados;
}

// ------------------------------------------------------------
// Handler principal da Edge Function
// Deploy: supabase functions deploy importar-feed-shopee
// ------------------------------------------------------------
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const inicio = new Date().toISOString();
  let totalImportados = 0;
  let pagina = 0;
  const LIMITE_POR_PAGINA = 50;

  try {
    const { data: categorias } = await supabase.from('categorias').select('id, slug');
    const categoriasIdPorSlug: Record<string, string> = Object.fromEntries(
      (categorias ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
    );

    while (true) {
      const nodes = await buscarPaginaDeOfertas(pagina, LIMITE_POR_PAGINA);
      if (nodes.length === 0) break;

      totalImportados += await importarLote(supabase, nodes, categoriasIdPorSlug);
      pagina++;

      // O schema público não confirma um campo pageInfo.hasNextPage;
      // paramos quando a página vier menor que o limite pedido.
      if (nodes.length < LIMITE_POR_PAGINA) break;
    }

    await supabase.from('logs_importacao').insert({
      fonte: 'shopee_feed',
      produtos_importados: totalImportados,
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, importados: totalImportados }), { status: 200 });
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
