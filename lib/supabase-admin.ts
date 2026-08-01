import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: este arquivo só pode ser importado por código que roda no
// servidor (Route Handlers, Server Components) — nunca por um componente
// 'use client'.
//
// Por que isso é seguro sem precisar de um pacote extra pra "travar" isso:
// SUPABASE_SERVICE_ROLE_KEY não tem o prefixo NEXT_PUBLIC_, e o Next.js só
// injeta no bundle do navegador as variáveis que começam com esse prefixo.
// Ou seja: mesmo que alguém importe este arquivo por engano dentro de um
// componente client, a variável chega como undefined no navegador — o
// createClient() abaixo quebra na hora (erro), mas a chave em si nunca
// trafega pro lado do cliente. A key só existe de verdade quando este
// código roda no servidor.
//
// Ela ignora RLS, então só é usada aqui pra resolver o link de afiliado
// real dentro de /go/[id] — nunca é enviada ao navegador.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
