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
// 2) O schema completo de productOfferV2 pode variar por conta/região;
//    valide os nomes de campo abaixo com uma chamada de teste antes de
//    rodar em produção.
// 3) Dados de LOJA (nome, avaliação, "oficial") não vêm nesse endpoint
//    de produtos — é preciso uma chamada separada (modo "shops" da API)
//    para enriquecer a tabela `lojas`. Aqui a loja é criada com dados
//    mínimos e confiabilidade neutra (50) até ser enriquecida.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// ------------------------------------------------------------
// Busca uma página de ofertas via productOfferV2
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
        }
      }
    }
  `;

  const payload = JSON.stringify({ query, variables: { page, limit } });
  const headers = await assinarRequisicao(payload);

  const resposta = await fetch(SHOPEE_GRAPHQL_URL, { method: 'POST', headers, body: payload });
  const dados = await resposta.json();

  if (dados.errors) {
    throw new Error(`Erro na API da Shopee: ${JSON.stringify(dados.errors)}`);
  }

  return dados.data?.productOfferV2?.nodes ?? [];
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
// A URL do produto costuma trazer o shopId e o itemId no formato
// ...-i.{shopId}.{itemId} — usamos isso para vincular o produto à loja.
// ------------------------------------------------------------
function extrairShopId(link: string): string | null {
  const match = link.match(/-i\.(\d+)\.(\d+)/);
  return match ? match[1] : null;
}

// ------------------------------------------------------------
// Garante que a loja exista (dados mínimos, sem reputação ainda)
// ------------------------------------------------------------
async function garantirLoja(supabase: any, shopeeShopId: string): Promise<string | null> {
  const { data: existente } = await supabase
    .from('lojas')
    .select('id')
    .eq('shopee_shop_id', Number(shopeeShopId))
    .maybeSingle();

  if (existente) return existente.id;

  const { data: nova } = await supabase
    .from('lojas')
    .insert({
      nome: `Loja Shopee ${shopeeShopId}`,
      shopee_shop_id: Number(shopeeShopId),
      confiabilidade_score: 50, // neutro até ser enriquecido pelo modo "shops" da API
    })
    .select('id')
    .single();

  return nova?.id ?? null;
}

// ------------------------------------------------------------
// Processa um lote de nós e grava/atualiza em `produtos`
// ------------------------------------------------------------
async function importarLote(supabase: any, nodes: ShopeeOfferNode[]): Promise<number> {
  let importados = 0;

  for (const node of nodes) {
    const precoAtual = parseFloat(node.priceMin);
    const precoAntigo = calcularPrecoAntigoAproximado(precoAtual, node.priceDiscountRate);
    const link = node.productLink ?? node.offerLink;
    const shopeeShopId = extrairShopId(link);
    const lojaId = shopeeShopId ? await garantirLoja(supabase, shopeeShopId) : null;

    await supabase.from('produtos').upsert(
      {
        shopee_item_id: node.itemId,
        nome: node.productName,
        loja_id: lojaId,
        // categoria_id: TODO — depende de uma tabela de mapeamento entre
        // productCatIds da Shopee e as categorias internas do Drop Secreto.
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
    while (true) {
      const nodes = await buscarPaginaDeOfertas(pagina, LIMITE_POR_PAGINA);
      if (nodes.length === 0) break;

      totalImportados += await importarLote(supabase, nodes);
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
