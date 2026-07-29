// ============================================================
// DROP SECRETO — Edge Function: atualizar-produtos-existentes
//
// Papel das 3 funções do backend agora:
// - importar-feed-shopee: DESCOBRE produto novo, varrendo o feed da
//   Shopee página por página (1 página por invocação).
// - atualizar-produtos-existentes (ESTE ARQUIVO): mantém o preço dos
//   produtos QUE JÁ ESTÃO na tabela `produtos` em dia — recheca direto
//   por item (shopId + itemId) na Shopee, sem depender do ciclo de
//   páginas do importador passar de novo por eles. Sempre pega os mais
//   desatualizados primeiro (ORDER BY atualizado_em ASC).
// - calcular-drop-score: decide aprovar/rejeitar com base no que as
//   outras duas atualizaram.
//
// atualizado_em e o histórico de preço (historico_precos) são mantidos
// AUTOMATICAMENTE por trigger no banco (ver supabase/migrations/
// 0001_init.sql, seção TRIGGERS) toda vez que preco_atual muda — esta
// função só precisa dar UPDATE no preço; o resto o Postgres cuida.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHOPEE_APP_ID = Deno.env.get('SHOPEE_APP_ID')!;
const SHOPEE_SECRET = Deno.env.get('SHOPEE_SECRET')!;
const SHOPEE_GRAPHQL_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Quantos produtos já publicados rechecar por invocação — mantém o
// trabalho síncrono bem abaixo do teto de CPU Time (2000ms). Suba aos
// poucos olhando os logs se quiser ir mais rápido.
const LOTE_POR_EXECUCAO = 30;

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
  if (dados.errors) throw new Error(`Erro na API da Shopee: ${JSON.stringify(dados.errors)}`);
  return dados.data;
}

async function mapComLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;
  async function worker() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, () => worker()));
  return resultados;
}

function calcularPrecoAntigoAproximado(precoAtual: number, descontoPercentual: number): number | null {
  if (!descontoPercentual || descontoPercentual <= 0) return null;
  return Math.round((precoAtual / (1 - descontoPercentual / 100)) * 100) / 100;
}

// productOfferV2 aceita shopId + itemId como filtro opcional pra buscar
// UM item específico, em vez de varrer o feed inteiro — é o que permite
// esta função ser "cirúrgica" ao invés de esperar a vez do produto no
// ciclo de páginas do importador.
async function buscarOfertaPorItem(shopId: number, itemId: number): Promise<any | null> {
  const query = `
    query FetchItem($shopId: Int64, $itemId: Int64) {
      productOfferV2(shopId: $shopId, itemId: $itemId, page: 1, limit: 1) {
        nodes {
          itemId
          priceMin
          priceDiscountRate
          sales
          ratingStar
        }
      }
    }
  `;
  const dados = await chamarGraphQL(query, { shopId, itemId });
  return dados?.productOfferV2?.nodes?.[0] ?? null;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Os mais desatualizados primeiro — é isso que garante que preço e
  // desconto na tela nunca ficam velhos por muito tempo.
  const { data: produtos, error: erroSelect } = await supabase
    .from('produtos')
    .select('id, shopee_item_id, loja_id, lojas(shopee_shop_id)')
    .eq('status', 'aprovado') // só recheca o que está de fato publicado no site
    .order('atualizado_em', { ascending: true })
    .limit(LOTE_POR_EXECUCAO);

  if (erroSelect) {
    return new Response(JSON.stringify({ ok: false, erro: erroSelect.message }), { status: 500 });
  }

  if (!produtos || produtos.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processados: 0, atualizados: 0, semLoja: 0, semOferta: 0, falhasApi: 0 }),
      { status: 200 }
    );
  }

  let atualizados = 0;
  let semLoja = 0; // produto sem loja_id resolvida — bug de import antigo, não da Shopee
  let semOferta = 0; // Shopee respondeu, mas sem oferta pra esse item agora
  let falhasApi = 0; // erro de verdade (rede, banco, etc.)

  await mapComLimite(produtos, 8, async (p: any) => {
    const shopId = p.lojas?.shopee_shop_id;

    // IMPORTANTE: em QUALQUER ramo abaixo — sucesso ou falha — o produto
    // precisa ter atualizado_em tocado. Sem isso, um produto quebrado
    // nunca sai da posição "mais antigo" e trava a fila inteira pra
    // sempre nos mesmos itens (foi exatamente o bug que travava tudo).
    if (!shopId) {
      semLoja++;
      console.error(
        `Produto ${p.id} (item ${p.shopee_item_id}) sem loja resolvida (loja_id=${p.loja_id ?? 'null'}) — desenfileirando pra não travar a fila.`
      );
      await supabase.from('produtos').update({ atualizado_em: new Date().toISOString() }).eq('id', p.id);
      return;
    }

    try {
      const oferta = await buscarOfertaPorItem(shopId, p.shopee_item_id);
      if (!oferta) {
        // A Shopee não retornou esse item nessa consulta específica.
        // NÃO estou mais assumindo que isso significa "saiu da campanha"
        // — não tenho certeza suficiente disso ainda. Só toca a fila e
        // loga, pra investigar com dado real em vez de chute.
        semOferta++;
        console.log(
          `Item ${p.shopee_item_id} (loja ${shopId}) não retornou oferta nessa consulta — mantendo como está, só reenfileirando.`
        );
        await supabase.from('produtos').update({ atualizado_em: new Date().toISOString() }).eq('id', p.id);
        return;
      }

      const precoAtual = parseFloat(oferta.priceMin);
      const precoAntigo = calcularPrecoAntigoAproximado(precoAtual, oferta.priceDiscountRate);

      const { error } = await supabase
        .from('produtos')
        .update({
          preco_atual: precoAtual,
          preco_antigo: precoAntigo,
          quantidade_vendida: oferta.sales,
          avaliacao: parseFloat(oferta.ratingStar) || 0,
          // atualizado_em e historico_precos são automáticos (trigger) —
          // não precisa (e não deve) setar aqui.
        })
        .eq('id', p.id);

      if (error) {
        falhasApi++;
        console.error(`Erro ao atualizar produto ${p.id}:`, error.message);
      } else {
        atualizados++;
      }
    } catch (erro) {
      falhasApi++;
      console.error(`Erro ao rechecar item ${p.shopee_item_id} (loja ${shopId}):`, erro);
      // Mesmo num erro de verdade (rede, timeout, etc.), toca a fila —
      // senão um erro passageiro também travaria esse produto na frente
      // pra sempre, do mesmo jeito que o bug do "sem loja" fazia.
      await supabase
        .from('produtos')
        .update({ atualizado_em: new Date().toISOString() })
        .eq('id', p.id)
        .then(() => {}, () => {});
    }
  });

  return new Response(
    JSON.stringify({
      ok: true,
      processados: produtos.length,
      atualizados,
      semLoja,
      semOferta,
      falhasApi,
    }),
    { status: 200 }
  );
});
