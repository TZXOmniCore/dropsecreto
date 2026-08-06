// ============================================================
// DROP SECRETO — Edge Function: reclassificar-categorias
//
// Por que uma function separada em vez de tentar de novo dentro do
// importar-feed-shopee: aquela function só tem ~2s de CPU Time por
// invocação (ver header dela) e seu trabalho é DESCOBRIR produto novo —
// forçá-la a também revisitar categoria de produto já existente competia
// pelo mesmo orçamento apertado de CPU, e deixava o log dela poluído com
// avisos de categoria no meio do que deveria ser só log de importação.
//
// Esta function cuida disso à parte:
//   - roda sobre produtos com categoria_id nula OU já jogados em "outros"
//     (a categoria coringa — ver migration 0002)
//   - tenta reclassificar pelo NOME do produto, com a mesma lógica de
//     palavra-chave usada no importador (fonte de verdade em
//     _shared/categoria-classifier.ts — copiada aqui pelo mesmo motivo do
//     deploy pela Dashboard não empacotar _shared; ver README)
//   - NÃO chama a API da Shopee — só lê/escreve no próprio banco, então
//     não custa rate limit nenhum e pode processar um lote bem maior sem
//     chegar perto do teto de CPU Time
//
// Fila própria: cada produto processado (dê match ou não) tem
// categoria_revisada_em tocado — isso garante que um produto sem
// categoria reconhecida não trava a fila pra sempre; ele só volta a ser
// tentado depois que todo o resto já foi revisado uma vez. É um campo
// separado de atualizado_em (fila de atualizar-produtos-existentes, que
// é sobre preço) de propósito — as duas filas não devem interferir uma
// na outra.
//
// Requer as colunas de supabase/migrations/0006_rotacao_sort_type_e_
// reclassificacao.sql (categoria_revisada_em e shopee_cat_ids em
// produtos).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Sem chamada de API externa — só banco — dá pra processar um lote maior
// que o das outras functions sem chegar perto do teto de CPU Time.
const LOTE_POR_EXECUCAO = 250;

// ------------------------------------------------------------
// Classificador por palavra-chave — MANTER EM SINCRONIA MANUAL com
// _shared/categoria-classifier.ts e com a cópia em
// importar-feed-shopee/index.ts (ver aviso lá também).
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

function resolverCategoriaSlug(productCatIds: number[] | null | undefined, nomeProduto: string): string {
  for (const catId of productCatIds ?? []) {
    const slug = MAPEAMENTO_CATEGORIAS[catId];
    if (slug) return slug;
  }

  const nome = (nomeProduto ?? '').toLowerCase();
  for (const [slug, palavras] of PALAVRAS_CHAVE_CATEGORIA) {
    if (palavras.some((p) => nome.includes(p))) return slug;
  }

  return 'outros';
}

// ------------------------------------------------------------
// Roda uma lista de itens com no máximo `limite` chamadas simultâneas.
// ------------------------------------------------------------
async function mapComLimite<T, R>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;

  async function worker() {
    while (proximo < itens.length) {
      const indiceAtual = proximo++;
      resultados[indiceAtual] = await fn(itens[indiceAtual]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, () => worker()));
  return resultados;
}

// ------------------------------------------------------------
// Handler da Edge Function — processa 1 lote por invocação.
// ------------------------------------------------------------
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: categorias, error: erroCategorias } = await supabase
    .from('categorias')
    .select('id, slug');

  if (erroCategorias || !categorias) {
    return new Response(
      JSON.stringify({ ok: false, erro: erroCategorias?.message ?? 'Falha ao carregar categorias' }),
      { status: 500 }
    );
  }

  const categoriaIdPorSlug: Record<string, string> = Object.fromEntries(
    categorias.map((c: { id: string; slug: string }) => [c.slug, c.id])
  );
  const idCategoriaOutros = categoriaIdPorSlug['outros'] ?? null;

  if (!idCategoriaOutros) {
    return new Response(
      JSON.stringify({ ok: false, erro: 'Categoria "outros" não encontrada — rodou a migration 0002?' }),
      { status: 500 }
    );
  }

  const { data: produtos, error: erroSelect } = await supabase
    .from('produtos')
    .select('id, nome, shopee_cat_ids, categoria_id')
    .or(`categoria_id.is.null,categoria_id.eq.${idCategoriaOutros}`)
    .order('categoria_revisada_em', { ascending: true, nullsFirst: true })
    .limit(LOTE_POR_EXECUCAO);

  if (erroSelect) {
    return new Response(JSON.stringify({ ok: false, erro: erroSelect.message }), { status: 500 });
  }

  if (!produtos || produtos.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, processados: 0, reclassificados: 0, aindaSemCategoria: 0 }),
      { status: 200 }
    );
  }

  let reclassificados = 0;
  let aindaSemCategoria = 0;

  await mapComLimite(produtos, 20, async (p: any) => {
    const slugEncontrado = resolverCategoriaSlug(p.shopee_cat_ids, p.nome);
    const agora = new Date().toISOString();

    if (slugEncontrado !== 'outros' && categoriaIdPorSlug[slugEncontrado]) {
      const { error } = await supabase
        .from('produtos')
        .update({ categoria_id: categoriaIdPorSlug[slugEncontrado], categoria_revisada_em: agora })
        .eq('id', p.id);

      if (!error) {
        reclassificados++;
      } else {
        aindaSemCategoria++;
        console.error(`Erro ao reclassificar produto ${p.id}:`, error.message);
      }
      return;
    }

    // Não achou categoria melhor ainda — só toca a fila (ver nota no topo
    // do arquivo sobre categoria_revisada_em) pra não travar sempre nos
    // mesmos produtos.
    aindaSemCategoria++;
    const { error } = await supabase
      .from('produtos')
      .update({ categoria_revisada_em: agora })
      .eq('id', p.id);

    if (error) {
      console.error(`Erro ao atualizar categoria_revisada_em do produto ${p.id}:`, error.message);
    }
  });

  return new Response(
    JSON.stringify({ ok: true, processados: produtos.length, reclassificados, aindaSemCategoria }),
    { status: 200 }
  );
});
