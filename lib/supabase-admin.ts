import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ATENÇÃO: este arquivo só pode ser importado por código que roda no
// servidor (Route Handlers, Server Components) — nunca por um componente
// 'use client'.
//
// Por que isso é seguro sem precisar de um pacote extra pra "travar" isso:
// SUPABASE_SERVICE_ROLE_KEY não tem o prefixo NEXT_PUBLIC_, e o Next.js só
// injeta no bundle do navegador as variáveis que começam com esse prefixo.
// Ou seja: mesmo que alguém importe este arquivo por engano dentro de um
// componente client, a variável chega como undefined no navegador — a
// função abaixo quebra na hora (erro), mas a chave em si nunca trafega
// pro lado do cliente. A key só existe de verdade quando este código
// roda no servidor.
//
// Ela ignora RLS, então só é usada aqui pra resolver o link de afiliado
// real dentro de /go/[id] — nunca é enviada ao navegador.
//
// IMPORTANTE: o cliente é criado de forma preguiçosa (só na primeira
// chamada de getSupabaseAdmin(), não no carregamento do arquivo). Se
// fosse criado direto num "export const", o Next.js executaria esse
// código também durante o "next build" (etapa de "Collecting page
// data"), e nesse momento a variável de ambiente pode não estar
// disponível ainda — derrubando o build inteiro com "supabaseKey is
// required" mesmo com a variável certa configurada na Vercel.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL) não configurada nas variáveis de ambiente.'
      );
    }

    client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  return client;
}
