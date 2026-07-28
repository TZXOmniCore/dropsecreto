// ============================================================
// DROP SECRETO — Importador do Feed Oficial da Shopee
// Busca ofertas via Shopee Affiliate Open API (GraphQL) e grava
// os produtos como "pendente" para o Motor de Drop Score analisar depois.
// Pensado para rodar como Supabase Edge Function (Deno/TypeScript),
// disparada por cron a cada poucos minutos — ver instruções de deploy
// no fim deste arquivo.
//
// CORREÇÕES NESTA VERSÃO — resolve o "CPU Time exceeded":
//
// 1) O limite que estava estourando NÃO é o de tempo de parede (150s de
//    idle timeout / 400s de duração máxima) — é o de CPU TIME, que no
//    Supabase é de só 2000ms de processamento ATIVO por invocação (não
//    conta espera de rede/banco — só conta o que o processador
//    efetivamente executa: parsing, HMAC, laços, etc). A versão anterior
//    tentava processar várias páginas dentro de um orçamento de 100s de
//    parede — isso cabia tranquilo no teto de tempo de parede, mas a soma
//    do trabalho síncrono de várias páginas seguidas estourava os 2s de
//    CPU, e a função era encerrada à força pelo runtime — por isso nem o
//    catch disparava, e o estado da página nunca chegava a ser salvo.
//    AGORA a função processa 1 página só por invocação — pouco trabalho
//    síncrono, bem abaixo do teto — e quem garante o ritmo de importação
//    é a frequência do cron, não um laço interno.
//
// 2) TABELA import_estado: o código já dependia dela pra saber em que
//    página continuar, mas o SQL de criação nunca tinha entrado no
//    projeto — a tabela provavelmente nunca existiu de verdade, então a
//    importação sempre recomeçava da página 1 e nunca avançava pelo
//    catálogo de verdade. Ver migration 0002_import_estado_e_categoria.sql.
//
// 3) NOTA DA LOJA: buscar shopOfferV2 (que exige outra assinatura HMAC)
//    pra TODA loja em TODA execução também pesava no orçamento de CPU.
//    Agora só busca de novo se a loja não tiver sido atualizada nas
//    últimas 24h — a nota de uma loja não muda minuto a minuto.
//
// 4) CATEGORIA: a Shopee não documenta os productCatIds da conta — não dá
//    pra "adivinhar" os números certos sem inventar informação. Em vez de
//    depender deles, a categoria agora é decidida por palavra-chave no
//    NOME do produto (dado real que a própria Shopee manda). Produto que
//    não bate com nenhuma palavra-chave conhecida cai em "outros" — nunca
//    fica sem categoria. Ver PALAVRAS_CHAVE_CATEGORIA mais abaixo; é uma
//    lista inicial, vale revisar/ampliar conforme os produtos reais forem
//    aparecendo nos logs.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Itens por página buscados na Shopee A CADA INVOCAÇÃO (1 página só).
// A Shopee documenta um teto de 500 por página — 100 é uma escolha
// conservadora pra manter o trabalho síncrono por invocação bem abaixo do
// teto de CPU Time; dá pra subir aos poucos observando logs_importacao
// (campo "erro") depois do deploy.
const LIMITE_POR_PAGINA = 100;

// Não busca nota da loja de novo se ela já foi atualizada há menos disso.
const IDADE_MAX_LOJA_MS = 24 * 60 * 60 * 1000; // 24h

const LOG_AMOSTRA_PRECO = 3;

// Mapeamento Shopee categoryId -> slug interno do Drop Secreto.
// Opcional: a Shopee não expõe endpoint de "lista de categorias" e não dá
// pra inventar os productCatIds reais da conta. Se um dia vocês
// descobrirem os IDs certos (ex.: batendo o productCatIds que aparece nos
// logs com o catálogo de categorias da própria conta Shopee), preencher
// aqui — esse mapeamento tem prioridade sobre a palavra-chave no nome.
// Até lá, fica vazio de propósito e a classificação roda 100% por nome.
const MAPEAMENTO_CATEGORIAS: Record<number, string> = {};

// Classificação por palavra-chave no nome do produto — lista inicial,
// cobrindo os nichos já cadastrados em categorias. Ordem importa: entradas
// mais específicas vêm antes das mais genéricas (ex.: "ssd" antes de
// "informatica") pra evitar que uma categoria ampla "roube" um produto que
// seria mais preciso em uma mais específica.
const PALAVRAS_CHAVE_CATEGORIA: Array<[string, string[]]> = [
  ['celulares', ['celular', 'smartphone', 'iphone', 'galaxy a', 'galaxy s', 'redmi', 'capinha de celular', 'película de vidro', 'pelicula de vidro']],
  ['ssd', ['ssd']],
  ['memoria-ram', ['memória ram', 'memoria ram', 'ddr3', 'ddr4', 'ddr5']],
  ['notebook', ['notebook', 'laptop', 'macbook']],
  ['monitor', ['monitor gamer', 'monitor led', 'monitor lcd', 'monitor curvo']],
  ['gamer', ['gamer', 'headset', 'controle ps4', 'controle ps5', 'controle xbox', 'volante gamer', 'cadeira gamer', 'mousepad']],
  ['informatica', ['mouse', 'teclado', 'webcam', 'impressora', 'pendrive', 'hd externo', 'ssd externo', 'roteador', 'placa mãe', 'placa-mãe', 'placa de vídeo', 'fonte atx', 'gabinete gamer', 'cooler']],
  ['ferramentas', ['furadeira', 'parafusadeira', 'chave de fenda', 'jogo de chaves', 'alicate', 'martelo', 'trena', 'kit ferramentas', 'multímetro', 'multimetro']],
  ['cozinha', ['panela', 'air fryer', 'fritadeira', 'liquidificador', 'cafeteira', 'talheres', 'frigideira', 'jogo de panelas']],
  ['casa', ['organizador', 'cortina', 'tapete', 'travesseiro', 'edredom', 'luminária', 'jogo de cama', 'toalha de banho']],
  ['beleza', ['batom', 'perfume', 'shampoo', 'creme facial', 'maquiagem', 'secador de cabelo', 'chapinha', 'base facial']],
  ['moda', ['camiseta', 'vestido', 'tênis', 'tenis', 'bolsa feminina', 'calça jeans', 'blusa', 'jaqueta', 'sandália', 'sandalia']],
  ['carro', ['pneu', 'som automotivo', 'capa de banco', 'suporte veicular', 'óleo de motor', 'oleo de motor', 'palheta limpador']],
  ['pets', ['ração', 'racao', 'coleira', 'brinquedo para cachorro', 'brinquedo para gato', 'areia sanitária', 'aquário', 'aquario']],
  ['criancas', ['brinquedo infantil', 'fralda', 'mamadeira', 'carrinho de bebê', 'carrinho de bebe', 'boneca', 'quebra-cabeça infantil']],
  ['smart-home', ['lâmpada inteligente', 'lampada inteligente', 'câmera de segurança', 'camera de seguranca', 'alexa', 'google home', 'fechadura digital', 'tomada inteligente']],
];

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
// Busca uma página de ofertas via productOfferV2, pedindo pageInfo pra
// saber de verdade se tem próxima página.
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

// Nunca retorna null — produto sem palavra-chave reconhecida cai em
// "outros" (ver migration 0002 pra a categoria existir de verdade).
function resolverCategoriaSlug(productCatIds: number[], nomeProduto: string): string {
  for (const catId of productCatIds ?? []) {
    const slug = MAPEAMENTO_CATEGORIAS[catId];
    if (slug) return slug;
  }

  const nome = (nomeProduto ?? '').toLowerCase();
  for (const [slug, palavras] of PALAVRAS_CHAVE_CATEGORIA) {
    if (palavras.some((p) => nome.includes(p))) return slug;
  }

  if (productCatIds?.length) {
    console.warn('Categoria não reconhecida por palavra-chave — caiu em "outros":', {
      productCatIds,
      nomeProduto,
    });
  }
  return 'outros';
}

// ------------------------------------------------------------
// Resolve (busca ou cria) a loja de UM shopId. Só busca a nota de novo na
// Shopee (shopOfferV2 + assinatura HMAC) se a loja for nova ou não tiver
// sido atualizada nas últimas 24h — é o que mais pesava no orçamento de
// CPU por invocação, e a nota de uma loja não muda de minuto a minuto.
// ------------------------------------------------------------
async function garantirLoja(
  supabase: any,
  shopId: number,
  shopName: string,
  shopOficial: boolean
): Promise<string | null> {
  const { data: existente } = await supabase
    .from('lojas')
    .select('id, atualizado_em')
    .eq('shopee_shop_id', shopId)
    .maybeSingle();

  const lojaAtualizadaRecentemente =
    !!existente?.atualizado_em &&
    Date.now() - new Date(existente.atualizado_em).getTime() < IDADE_MAX_LOJA_MS;

  if (existente && lojaAtualizadaRecentemente) {
    return existente.id;
  }

  const notaLoja = await buscarNotaLoja(shopId);

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
// grava todos os produtos em paralelo (já com o loja_id em mãos). Erro num
// item isolado não derruba o lote inteiro — só fica de fora dessa leva e
// entra de novo na próxima passada pelo catálogo.
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
    try {
      const lojaId = await garantirLoja(supabase, shopId, info.shopName, info.shopOficial);
      lojaIdPorShopId.set(shopId, lojaId);
    } catch (erro) {
      console.error(`Erro ao resolver loja ${shopId}:`, erro);
      lojaIdPorShopId.set(shopId, null);
    }
  });

  let importados = 0;

  await mapComLimite(nodes, 8, async (node, indice) => {
    try {
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

      const categoriaSlug = resolverCategoriaSlug(node.productCatIds, node.productName);
      const categoriaId = categoriasIdPorSlug[categoriaSlug] ?? null;

      const { error } = await supabase.from('produtos').upsert(
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

      if (error) throw error;
      importados++;
    } catch (erro) {
      console.error(`Erro ao importar item ${node.itemId}:`, erro);
    }
  });

  return importados;
}

// ------------------------------------------------------------
// Lê/grava em qual página a próxima execução deve continuar.
// Requer a tabela import_estado — ver migration 0002.
// ------------------------------------------------------------
async function lerProximaPagina(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from('import_estado')
    .select('proxima_pagina')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao ler import_estado (rodou a migration 0002?):', error.message);
  }
  return data?.proxima_pagina ?? 1;
}

async function salvarProximaPagina(supabase: any, pagina: number) {
  const { error } = await supabase
    .from('import_estado')
    .upsert({ id: 1, proxima_pagina: pagina, atualizado_em: new Date().toISOString() });

  if (error) {
    console.error('Erro ao salvar import_estado (rodou a migration 0002?):', error.message);
  }
}

// ------------------------------------------------------------
// Handler principal da Edge Function — processa 1 página por invocação.
// Deploy: supabase functions deploy importar-feed-shopee
// Agendamento: ver instruções de cron no README da pasta supabase/.
// ------------------------------------------------------------
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const inicio = new Date().toISOString();

  let totalImportados = 0;
  let pagina = 1;

  try {
    const { data: categorias } = await supabase.from('categorias').select('id, slug');
    const categoriasIdPorSlug: Record<string, string> = Object.fromEntries(
      (categorias ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
    );

    pagina = await lerProximaPagina(supabase);

    const { nodes, pageInfo } = await buscarPaginaDeOfertas(pagina, LIMITE_POR_PAGINA);

    if (nodes.length > 0) {
      totalImportados = await importarLote(supabase, nodes, categoriasIdPorSlug);
    }

    // Sem próxima página (ou página veio vazia) — fecha o ciclo e a
    // próxima execução recomeça do início do feed.
    const temProximaPagina = pageInfo?.hasNextPage ?? nodes.length === LIMITE_POR_PAGINA;
    const proximaPagina =
      nodes.length === 0 || !temProximaPagina ? 1 : (pageInfo?.page ?? pagina) + 1;

    await salvarProximaPagina(supabase, proximaPagina);

    await supabase.from('logs_importacao').insert({
      fonte: 'shopee_feed',
      produtos_importados: totalImportados,
      iniciado_em: inicio,
      finalizado_em: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, importados: totalImportados, pagina, proximaPagina }),
      { status: 200 }
    );
  } catch (erro) {
    // Mesmo em erro, tenta preservar a página em que estava (não volta a
    // importação inteira pro zero por causa de uma falha pontual).
    await salvarProximaPagina(supabase, pagina).catch(() => {});

    await supabase
      .from('logs_importacao')
      .insert({
        fonte: 'shopee_feed',
        produtos_importados: totalImportados,
        erro: String(erro),
        iniciado_em: inicio,
        finalizado_em: new Date().toISOString(),
      })
      .catch(() => {});

    return new Response(JSON.stringify({ ok: false, erro: String(erro) }), { status: 500 });
  }
});
