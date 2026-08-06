// ============================================================
// Funções puras usadas por app/go/[id]/route.ts — separadas num arquivo
// próprio só pra poderem ser testadas diretamente com Vitest (um Route
// Handler do Next.js não é trivial de testar isolado; estas funções sim).
// ============================================================

// UUID (formato usado pelo Supabase pro id de produto). Valida antes de
// bater no banco — barato, e evita mandar lixo pra query por engano ou
// por tentativa de abuso via URL manipulada.
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Garante que o link do afiliado é uma URL absoluta válida e sem
// caracteres que quebram um header HTTP (quebra de linha, tab, espaço
// cru, acentos não codificados). Se não der pra confiar no link, retorna
// null e quem chamou decide o fallback — nunca deixa passar algo que
// pode derrubar a resposta.
export function sanitizarLinkAfiliado(bruto: string): string | null {
  try {
    // remove quebras de linha, tabs e outros caracteres de controle
    const limpo = bruto.trim().replace(/[\r\n\t\u0000-\u001f\u007f]/g, '');
    if (!limpo) return null;

    const url = new URL(limpo);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    // recodifica qualquer acento/caractere especial que tenha sobrado cru
    return encodeURI(decodeURI(url.toString()));
  } catch {
    return null;
  }
}

export interface OpcoesLimitador {
  janelaMs: number;
  limitePorJanela: number;
}

// Rate limit simples, em memória, por chave (tipicamente IP) — sem
// depender de nenhum serviço externo (Redis/Upstash) nem custar nada.
//
// Limitação conhecida (documentada, não corrigida aqui): numa função
// serverless, cada instância "fria" tem seu próprio contador (não é
// compartilhado entre instâncias). Não é uma defesa perfeita contra um
// ataque distribuído sério, mas cobre o cenário mais comum (um bot
// simples batendo repetido do mesmo IP) e pode ser trocado por um rate
// limit compartilhado (ex.: Upstash Redis) mais pra frente, se o
// tráfego/custo justificar depender de um serviço externo novo.
//
// Correção incluída aqui: sem limpeza, o Map cresceria pra sempre (uma
// entrada por IP novo que já passou da janela vira lixo que nunca é
// removido) — uma limpeza leve varre entradas expiradas periodicamente
// em vez de a cada chamada, pra não pagar esse custo toda requisição.
export function criarLimitador({ janelaMs, limitePorJanela }: OpcoesLimitador) {
  const contadorPorChave = new Map<string, { contagem: number; resetaEm: number }>();
  const LIMPEZA_A_CADA_N_CHAMADAS = 500;
  let chamadasDesdeLimpeza = 0;

  function limparExpirados(agora: number) {
    for (const [chave, valor] of contadorPorChave) {
      if (agora > valor.resetaEm) contadorPorChave.delete(chave);
    }
  }

  return function excedeuLimite(chave: string): boolean {
    const agora = Date.now();

    chamadasDesdeLimpeza += 1;
    if (chamadasDesdeLimpeza >= LIMPEZA_A_CADA_N_CHAMADAS) {
      chamadasDesdeLimpeza = 0;
      limparExpirados(agora);
    }

    const atual = contadorPorChave.get(chave);
    if (!atual || agora > atual.resetaEm) {
      contadorPorChave.set(chave, { contagem: 1, resetaEm: agora + janelaMs });
      return false;
    }
    atual.contagem += 1;
    return atual.contagem > limitePorJanela;
  };
}
