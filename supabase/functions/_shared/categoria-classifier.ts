// ============================================================
// DROP SECRETO — Classificador de categoria por palavra-chave
//
// Fonte de verdade (só usada de fato se um dia o deploy migrar pra CLI —
// ver README). Pela Dashboard, tanto importar-feed-shopee quanto
// reclassificar-categorias têm sua PRÓPRIA cópia deste arquivo colada
// dentro do index.ts, pelo mesmo motivo do _shared/drop-score-engine.ts:
// o dashboard não empacota import de pasta _shared. Se mudar palavra-
// chave ou categoria aqui, muda NOS TRÊS lugares (aqui + as duas cópias).
//
// A Shopee não documenta os productCatIds da conta — não dá pra
// "adivinhar" os números certos sem inventar informação. Por isso a
// categoria é decidida por palavra-chave no NOME do produto (dado real
// que a própria Shopee manda), com productCatIds como prioridade SE um
// dia o mapeamento for descoberto e preenchido em MAPEAMENTO_CATEGORIAS
// (fica vazio de propósito por enquanto). Produto que não bate com
// nenhuma palavra-chave conhecida cai em "outros" — nunca fica sem
// categoria; a function reclassificar-categorias tenta de novo depois.
// ============================================================

// Mapeamento Shopee categoryId -> slug interno do Drop Secreto. Tem
// prioridade sobre a palavra-chave. Preencher aqui se um dia descobrirem
// os productCatIds reais da conta (ex.: batendo o que aparece salvo em
// produtos.shopee_cat_ids com o catálogo de categorias da própria conta
// Shopee).
export const MAPEAMENTO_CATEGORIAS: Record<number, string> = {};

// Ordem importa: entradas mais específicas vêm antes das mais genéricas
// (ex.: "ssd" antes de "informatica") pra evitar que uma categoria ampla
// "roube" um produto que seria mais preciso em uma mais específica. Lista
// inicial — vale revisar/ampliar conforme os produtos reais forem
// aparecendo nos logs (console.warn de "categoria não reconhecida").
export const PALAVRAS_CHAVE_CATEGORIA: Array<[string, string[]]> = [
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

// Nunca retorna null — produto sem palavra-chave reconhecida cai em
// "outros" (ver migration 0002 pra a categoria existir de verdade).
export function resolverCategoriaSlug(productCatIds: number[] | null | undefined, nomeProduto: string): string {
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
