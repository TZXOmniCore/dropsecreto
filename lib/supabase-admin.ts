import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: este arquivo só pode ser importado por código que roda no
// servidor (Route Handlers, Server Components). A "server-only" acima
// faz o build FALHAR se algum componente client tentar importar este
// arquivo por engano — é a mesma classe de erro que vazaria a service
// role key inteira pro navegador.
//
// SUPABASE_SERVICE_ROLE_KEY (sem prefixo NEXT_PUBLIC_) precisa estar
// configurada nas variáveis de ambiente da Vercel. Ela ignora RLS, então
// só é usada aqui pra resolver o link de afiliado real dentro de
// /go/[id] — nunca é enviada ao navegador.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
