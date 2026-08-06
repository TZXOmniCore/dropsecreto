import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { UUID_REGEX, sanitizarLinkAfiliado, criarLimitador } from '@/lib/link-redirect';

// ============================================================
// DROP SECRETO — Redirecionador de afiliado
// ============================================================
// Antes: o frontend buscava a coluna link_afiliado direto do Supabase
// (chave anon, pública) e o BotaoComprar renderizava <a href={linkAfiliado}>
// puro — qualquer pessoa inspecionando a resposta da API via devtools
// via a URL de afiliado de todo produto do catálogo, sem nem clicar. NOSONAR
//
// Agora: o frontend nunca recebe link_afiliado (foi tirado do SELECT
// público em lib/produtos.ts). O botão "Comprar na loja" aponta pra
// /go/[id]; essa rota roda no servidor, busca o link real com a
// service role key (que ignora RLS) e faz um 302 redirect. O link
// cru nunca aparece em nenhuma resposta que o navegador consegue ler
// como dado — só como destino final de uma navegação.
//
// IMPORTANTE (correção): essa rota é a ÚNICA parte do site que depende
// da SUPABASE_SERVICE_ROLE_KEY. Se essa variável estiver ausente/errada
// na Vercel, ou se o link_afiliado vier com algum caractere inválido pra
// header HTTP (quebra de linha, espaço cru, acento não codificado), o
// redirect quebrava sem tratamento nenhum e a Vercel devolvia uma
// resposta incompleta pro navegador — daí o erro ERR_INVALID_RESPONSE.
// Agora TUDO que pode falhar aqui está protegido: qualquer erro cai
// num redirect normal pra página do produto, nunca numa resposta quebrada.
// ============================================================

export const dynamic = 'force-dynamic';

// UUID_REGEX, sanitizarLinkAfiliado e criarLimitador foram movidos pra
// lib/link-redirect.ts — mesma lógica de antes, só extraída pra um
// arquivo próprio pra poder ser testada com Vitest (ver
// lib/__tests__/link-redirect.test.ts). Limite generoso o bastante pra
// nunca incomodar uma pessoa real clicando em produtos, mas que já barra
// script batendo essa rota em loop.
const excedeuLimite = criarLimitador({ janelaMs: 60_000, limitePorJanela: 30 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = request.nextUrl.origin;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconhecido';
  if (excedeuLimite(ip)) {
    return new NextResponse('Muitas requisições. Tente novamente em instantes.', { status: 429 });
  }

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.redirect(`${origin}/`, { status: 302 });
  }

  // Destino de segurança: se qualquer coisa der errado a partir daqui,
  // cai aqui em vez de deixar a resposta quebrar.
  const fallback = () => NextResponse.redirect(`${origin}/produto/${id}`, { status: 302 });

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: produto, error } = await supabaseAdmin
      .from('produtos')
      .select('id, link_afiliado, status, ativo')
      .eq('id', id)
      .maybeSingle();

    // Produto não existe, foi removido, ou não está mais aprovado/ativo —
    // manda pra página do produto, que já sabe mostrar "não disponível"
    // com sugestões, em vez de estourar erro.
    if (error || !produto) {
      return fallback();
    }

    if (produto.status !== 'aprovado' || !produto.ativo || !produto.link_afiliado) {
      return fallback();
    }

    const linkFinal = sanitizarLinkAfiliado(produto.link_afiliado);
    if (!linkFinal) {
      console.error(`[go/${id}] link_afiliado inválido no banco:`, produto.link_afiliado);
      return fallback();
    }

    // Registra o clique pro dashboard admin (tabela "cliques" já existia
    // no schema, só nunca tinha sido usada). Nunca deixa uma falha aqui
    // travar o redirect — registrar clique é "nice to have", não pode
    // atrasar quem só quer comprar.
    try {
      await supabaseAdmin.from('cliques').insert({ produto_id: produto.id, origem: 'site' });
    } catch {
      // segue o jogo
    }

    return NextResponse.redirect(linkFinal, { status: 302 });
  } catch (err) {
    // Cobre qualquer falha inesperada: chave de serviço ausente/errada,
    // banco fora do ar, URL malformada passando pelo redirect, etc.
    // Isso é o que evita a tela de "não é possível acessar esse site".
    console.error(`[go/${id}] erro inesperado no redirecionamento:`, err);
    return fallback();
  }
}
