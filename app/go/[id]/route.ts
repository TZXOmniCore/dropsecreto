import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// ============================================================
// DROP SECRETO — Redirecionador de afiliado
// ============================================================
// Antes: o frontend buscava a coluna link_afiliado direto do Supabase
// (chave anon, pública) e o BotaoComprar renderizava <a href={linkAfiliado}>
// puro — qualquer pessoa inspecionando a resposta da API via devtools
// via a URL de afiliado de todo produto do catálogo, sem nem clicar.
//
// Agora: o frontend nunca recebe link_afiliado (foi tirado do SELECT
// público em lib/produtos.ts). O botão "Comprar na loja" aponta pra
// /go/[id]; essa rota roda no servidor, busca o link real com a
// service role key (que ignora RLS) e faz um 302 redirect. O link
// cru nunca aparece em nenhuma resposta que o navegador consegue ler
// como dado — só como destino final de uma navegação.
// ============================================================

export const dynamic = 'force-dynamic';

// UUID (formato usado pelo Supabase pro id de produto). Valida antes de
// bater no banco — barato, e evita mandar lixo pra query por engano ou
// por tentativa de abuso via URL manipulada.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const origin = request.nextUrl.origin;

  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.redirect(`${origin}/`, { status: 302 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: produto, error } = await supabaseAdmin
    .from('produtos')
    .select('id, link_afiliado, status, ativo')
    .eq('id', id)
    .maybeSingle();

  // Produto não existe, foi removido, ou não está mais aprovado/ativo —
  // manda pra página do produto, que já sabe mostrar "não disponível"
  // com sugestões, em vez de estourar erro.
  if (error || !produto || produto.status !== 'aprovado' || !produto.ativo || !produto.link_afiliado) {
    return NextResponse.redirect(`${origin}/produto/${id}`, { status: 302 });
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

  return NextResponse.redirect(produto.link_afiliado, { status: 302 });
}
