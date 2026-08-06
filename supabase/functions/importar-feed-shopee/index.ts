// ============================================================
// DROP SECRETO — Importador do Feed Oficial da Shopee
// Busca ofertas via Shopee Affiliate Open API (GraphQL) e grava
// os produtos como "pendente" para o Motor de Drop Score analisar depois.
// Pensado para rodar como Supabase Edge Function (Deno/TypeScript),
// disparada por cron a cada poucos minutos — ver instruções de deploy
// no fim deste arquivo.
//
// CORREÇÕES DE VERSÕES ANTERIORES (resolviam o "CPU Time exceeded"):
//
// 1) O limite que estava estourando NÃO é o de tempo de parede (150s de
//    idle timeout / 400s de duração máxima) — é o de CPU TIME, que no
//    Supabase é de só 2000ms de processamento ATIVO por invocação (não
//    conta espera de rede/banco — só conta o que o processador
//    efetivamente executa: parsing, HMAC, laços, etc). A função processa
//    1 página só por invocação — pouco trabalho síncrono, bem abaixo do
//    teto — e quem garante o ritmo de importação é a frequência do cron,
//    não um laço interno.
//
// 2) TABELA import_estado (migration 0002): guarda em que página
//    continuar — sem ela a importação sempre recomeçava da página 1.
//
// 3) NOTA DA LOJA: só busca de novo se a loja não tiver sido atualizada
//    nas últimas 24h — a nota de uma loja não muda minuto a minuto.
//
// 4) CATEGORIA: decidida por palavra-chave no NOME do produto — ver
//    PALAVRAS_CHAVE_CATEGORIA mais abaixo (fonte de verdade espelhada em
//    _shared/categoria-classifier.ts).
//
// CORREÇÃO 5 (a causa real de só ~1200 produtos importados em 10 dias):
// a Shopee Affiliate API tem um teto real de PROFUNDIDADE de paginação —
// depois de um certo número de páginas ela para de devolver
// "hasNextPage: true" mesmo se o catálogo total for maior (é um limite
// comum em API de busca/feed de marketplace, não só da Shopee). Como o
// importador sempre pedia a mesma ordenação (sortType 2 = mais vendidos),
// toda vez que o ciclo de páginas fechava e reiniciava da página 1, ele
// caía exatamente na MESMA fatia de produtos de novo — nunca alcançava o
// resto do catálogo. Agora o importador guarda também qual sortType está
// usando (import_estado.sort_type — ver migration 0006) e alterna pra um
// diferente da lista ROTACAO_SORT_TYPE toda vez que fecha um ciclo, então
// cada volta completa traz uma fatia diferente do catálogo (por vendas,
// relevância, comissão, preço) em vez de repetir sempre a mesma.
//
// CORREÇÃO 6 (observabilidade de categoria): o productCatIds bruto que a
// Shopee manda agora é salvo em produtos.shopee_cat_ids (migration 0006)
// — não é usado pra classificar ainda (MAPEAMENTO_CATEGORIAS continua
// vazio, ver nota abaixo), mas fica guardado pra quando esse mapeamento
// for descoberto, sem precisar reimportar nada. A classificação errada
// que caía em "outros" e ficava presa lá agora também é revisitada à
// parte pela function reclassificar-categorias (não é papel desta
// function tentar de novo — ver README).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Itens por página buscados na Shopee A CADA INVOCAÇÃO (1 página só).
// 50 é o TETO REAL da API — confirmado pelo próprio erro da Shopee
// ("Exceeded the maximum number of page limit, the maximum limit is 50")
// quando tentei 100. Não dá pra subir esse número.
const LIMITE_POR_PAGINA = 50;

// Ver CORREÇÃO 5 no topo do arquivo. Ordem: vendas (mais alinhado com o
// que o Drop Score valoriza) → relevância → comissão → preço desc → preço
// asc. Ao fechar um ciclo de páginas, passa pro próximo desta lista.
const ROTACAO_SORT_TYPE: number[] = [2, 1, 5, 3, 4];

// Não busca nota da loja de novo se ela já foi atualizada há menos disso.
const IDADE_MAX_LOJA_MS = 24 * 60 * 60 * 1000; // 24h

const LOG_AMOSTRA_PRECO = 3;

// ------------------------------------------------------------
// Classificador por palavra-chave — MANTER EM SINCRONIA MANUAL com
// _shared/categoria-classifier.ts e com a cópia em
// reclassificar-categorias/index.ts (ver aviso lá também). Pela
// Dashboard do Supabase, nenhuma das 3 functions consegue importar de
// _shared — cada uma precisa da própria cópia.
// ------------------------------------------------------------
const MAPEAMENTO_CATEGORIAS: Record<number, string> = {};

const PALAVRAS_CHAVE_CATEGORIA: Array<[string, string[]]> = [
  ['celulares', ['celular', 'smartphone', 'iphone', 'galaxy a', 'galaxy s', 'redmi', 'xiaomi', 'motorola g', 'capinha de celular', 'capa de celular', 'película de vidro', 'pelicula de vidro', 'carregador de celular', 'fone bluetooth']],
  ['ssd', ['ssd']],
  ['memoria-ram', ['memória ram', 'memoria ram', 'ddr3', 'ddr4', 'ddr5']],
  ['notebook', ['notebook', 'laptop', 'macbook', 'ultrabook', 'chromebook']],
  ['monitor', ['monitor gamer', 'monitor led', 'monitor lcd', 'monitor curvo', 'monitor ultrawide']],
  ['gamer', ['gamer', 'headset', 'controle ps4', 'controle ps5', 'controle xbox', 'volante gamer', 'cadeira gamer', 'mousepad', 'joystick', 'teclado mecânico', 'teclado mecanico']],
  ['informatica', ['mouse', 'teclado', 'webcam', 'impressora', 'pendrive', 'hd externo', 'ssd externo', 'roteador', 'placa mãe', 'placa-mãe', 'placa de vídeo', 'fonte atx', 'gabinete gamer', 'cooler', 'adaptador usb', 'cabo hdmi', 'hub usb']],
  ['ferramentas', ['furadeira', 'parafusadeira', 'chave de fenda', 'jogo de chaves', 'alicate', 'martelo', 'trena', 'kit ferramentas', 'multímetro', 'multimetro', 'serra tico-tico', 'nível a laser', 'nivel a laser']],
  ['cozinha', ['panela', 'air fryer', 'fritadeira', 'liquidificador', 'cafeteira', 'talheres', 'frigideira', 'jogo de panelas', 'panela de pressão', 'panela de pressao', 'batedeira']],
  ['casa', ['organizador', 'cortina', 'tapete', 'travesseiro', 'edredom', 'luminária', 'luminaria', 'jogo de cama', 'toalha de banho', 'aspirador de pó', 'aspirador de po', 'ventilador']],
  ['beleza', ['batom', 'perfume', 'shampoo', 'creme facial', 'maquiagem', 'secador de cabelo', 'chapinha', 'base facial', 'protetor solar', 'escova de cabelo']],
  ['moda', ['camiseta', 'vestido', 'tênis', 'tenis', 'bolsa feminina', 'calça jeans', 'blusa', 'jaqueta', 'sandália', 'sandalia', 'relógio', 'relogio', 'óculos de sol', 'oculos de sol', 'mochila']],
  ['carro', ['pneu', 'som automotivo', 'capa de banco', 'suporte veicular', 'óleo de motor', 'oleo de motor', 'palheta limpador', 'bateria automotiva', 'multimídia automotivo', 'multimidia automotivo']],
  ['pets', ['ração', 'racao', 'coleira', 'brinquedo para cachorro', 'brinquedo para gato', 'areia sanitária', 'areia sanitaria', 'aquário', 'aquario', 'antipulgas', 'caminha para cachorro']],
  ['criancas', ['brinquedo infantil', 'fralda', 'mamadeira', 'carrinho de bebê', 'carrinho de bebe', 'boneca', 'quebra-cabeça infantil', 'quebra-cabeca infantil', 'triciclo', 'jogo educativo']],
  ['smart-home', ['lâmpada inteligente', 'lampada inteligente', 'câmera de segurança', 'camera de seguranca', 'alexa', 'google home', 'fechadura digital', 'tomada inteligente', 'sensor de presença', 'sensor de presenca', 'interruptor inteligente']],
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
// saber de verdade se tem próxima página. sortType agora é variável (ver
// CORREÇÃO 5 no topo do arquivo) — antes era fixo (sortType: 2 fixo no
// texto da query, nunca mudava).
// ------------------------------------------------------------
async function buscarPaginaDeOfertas(
  page: number,
  limit: number,
  sortType: number
): Promise<{ nodes: ShopeeOfferNode[]; pageInfo: PageInfo | null }> {
  const query = `
    query Fetch($page: Int, $limit: Int, $sortType: Int) {
      productOfferV2(listType: 0, sortType: $sortType, page: $page, limit: $limit) {
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

  const dados = await chamarGraphQL(query, { page, limit, sortType });
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
    // CORREÇÃO: a Shopee declara shopId como escala Int64 — só aceita como
    // STRING no JSON da variável (number puro do JS/JSON não representa 64
    // bits com segurança e a API rejeitava com "wrong type" em toda chamada,
    // fazendo avaliacao_media da loja nunca ser preenchida de verdade).
    const dados = await chamarGraphQL(query, { shopId: String(shopId) });
    const nota = Number.parseFloat(dados?.shopOfferV2?.nodes?.[0]?.ratingStar) || null;
    cacheNotaLoja.set(shopId, nota);
    return nota;
  } catch (error_) {
    console.error(`Erro ao buscar nota da loja ${shopId}:`, error_);
    cacheNotaLoja.set(shopId, null);
    return null;
  }
}

function calcularPrecoAntigoAproximado(precoAtual: number, descontoPercentual: number): number | null {
  if (!descontoPercentual || descontoPercentual <= 0) return null;
  return Math.round((precoAtual / (1 - descontoPercentual / 100)) * 100) / 100;
}

// Nunca retorna null — produto sem palavra-chave reconhecida cai em
// "outros" (ver migration 0002 pra a categoria existir de verdade). A
// function reclassificar-categorias tenta de novo depois, à parte.
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
    } catch (error_) {
      console.error(`Erro ao resolver loja ${shopId}:`, error_);
      lojaIdPorShopId.set(shopId, null);
    }
  });

  let importados = 0;

  await mapComLimite(nodes, 8, async (node, indice) => {
    try {
      const precoAtual = Number.parseFloat(node.priceMin);
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
          // Bruto da Shopee — ver CORREÇÃO 6 no topo do arquivo. Não usado
          // pra classificar ainda, só guardado pro futuro.
          shopee_cat_ids: node.productCatIds ?? [],
          imagem_principal_url: node.imageUrl,
          preco_atual: precoAtual,
          preco_antigo: precoAntigo,
          avaliacao: Number.parseFloat(node.ratingStar) || 0,
          quantidade_vendida: node.sales,
          link_afiliado: node.offerLink,
          link_original: node.productLink,
          status: 'pendente', // o Motor de Drop Score decide aprovar/rejeitar depois
          // Sem isso, produto que JÁ EXISTE (upsert cai no UPDATE por
          // conflito) mantém o atualizado_em congelado no valor do import
          // original pra sempre — o default da coluna só se aplica em
          // INSERT novo, e o upsert só atualiza as colunas presentes aqui.
          // Era exatamente por isso que "verificado há X" ficava travado.
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'shopee_item_id' }
      );

      if (error) throw error;
      importados++;
    } catch (error_) {
      console.error(`Erro ao importar item ${node.itemId}:`, error_);
    }
  });

  return importados;
}

// ------------------------------------------------------------
// Lê/grava em qual página e sortType a próxima execução deve continuar.
// Requer as colunas de migration 0002 (proxima_pagina) e 0006 (sort_type).
// ------------------------------------------------------------
async function lerEstado(supabase: any): Promise<{ proximaPagina: number; sortTypeAtual: number }> {
  const { data, error } = await supabase
    .from('import_estado')
    .select('proxima_pagina, sort_type')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao ler import_estado (rodou as migrations 0002 e 0006?):', error.message);
  }
  return {
    proximaPagina: data?.proxima_pagina ?? 1,
    sortTypeAtual: data?.sort_type ?? ROTACAO_SORT_TYPE[0],
  };
}

async function salvarEstado(supabase: any, pagina: number, sortType: number) {
  const { error } = await supabase
    .from('import_estado')
    .upsert({ id: 1, proxima_pagina: pagina, sort_type: sortType, atualizado_em: new Date().toISOString() });

  if (error) {
    console.error('Erro ao salvar import_estado (rodou as migrations 0002 e 0006?):', error.message);
  }
}

// Próximo sortType da rotação — ver CORREÇÃO 5 no topo do arquivo.
function proximoSortType(atual: number): number {
  const indiceAtual = ROTACAO_SORT_TYPE.indexOf(atual);
  const proximoIndice = indiceAtual === -1 ? 0 : (indiceAtual + 1) % ROTACAO_SORT_TYPE.length;
  return ROTACAO_SORT_TYPE[proximoIndice];
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
  let sortTypeAtual = ROTACAO_SORT_TYPE[0];

  try {
    const { data: categorias } = await supabase.from('categorias').select('id, slug');
    const categoriasIdPorSlug: Record<string, string> = Object.fromEntries(
      (categorias ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id])
    );

    const estado = await lerEstado(supabase);
    pagina = estado.proximaPagina;
    sortTypeAtual = estado.sortTypeAtual;

    console.log(`Buscando página ${pagina} (sortType ${sortTypeAtual})...`);

    const { nodes, pageInfo } = await buscarPaginaDeOfertas(pagina, LIMITE_POR_PAGINA, sortTypeAtual);

    if (nodes.length > 0) {
      totalImportados = await importarLote(supabase, nodes, categoriasIdPorSlug);
    }

    // Sem próxima página (ou página veio vazia) — fecha o ciclo desse
    // sortType e a próxima execução recomeça da página 1 com o PRÓXIMO
    // sortType da rotação (ver CORREÇÃO 5 no topo do arquivo). Antes
    // recomeçava sempre com o mesmo sortType, e por isso sempre repetia a
    // mesma fatia do catálogo.
    const temProximaPagina = pageInfo?.hasNextPage ?? nodes.length === LIMITE_POR_PAGINA;
    const fechouCiclo = nodes.length === 0 || !temProximaPagina;

    const proximaPagina = fechouCiclo ? 1 : (pageInfo?.page ?? pagina) + 1;
    const proximoSort = fechouCiclo ? proximoSortType(sortTypeAtual) : sortTypeAtual;

    await salvarEstado(supabase, proximaPagina, proximoSort);

    try {
      await supabase.from('logs_importacao').insert({
        fonte: 'shopee_feed',
        produtos_importados: totalImportados,
        iniciado_em: inicio,
        finalizado_em: new Date().toISOString(),
      });
    } catch (error_) {
      console.error('Falha ao gravar log de sucesso em logs_importacao:', error_);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        importados: totalImportados,
        pagina,
        sortTypeUsado: sortTypeAtual,
        proximaPagina,
        proximoSortType: proximoSort,
      }),
      { status: 200 }
    );
  } catch (error_) {
    // Mesmo em erro, tenta preservar a página e o sortType em que estava
    // (não volta a importação inteira pro zero por causa de uma falha
    // pontual).
    await salvarEstado(supabase, pagina, sortTypeAtual).catch(() => {});

    // IMPORTANTE: o builder do supabase-js (.from().insert()) só implementa
    // .then() — não é uma Promise de verdade, não tem .catch(). Chamar
    // .catch() direto nele estoura "TypeError: ...insert(...).catch is not
    // a function" e derruba a função ANTES de logar o erro real. Por isso
    // aqui usa try/catch em vez de encadear .catch().
    try {
      await supabase.from('logs_importacao').insert({
        fonte: 'shopee_feed',
        produtos_importados: totalImportados,
        erro: String(error_),
        iniciado_em: inicio,
        finalizado_em: new Date().toISOString(),
      });
    } catch (error_) {
      console.error('Falha ao gravar log de erro em logs_importacao:', error_);
    }

    // Não devolve String(error_) no corpo da resposta: pode conter caminho
    // de arquivo, stack trace ou outro detalhe interno do runtime. O erro
    // completo já foi logado acima (console.error + logs_importacao) —
    // aqui só confirma pro chamador que falhou, sem vazar detalhe interno.
    return new Response(JSON.stringify({ ok: false, erro: 'Falha ao importar feed. Ver logs_importacao para detalhes.' }), {
      status: 500,
    });
  }
});
