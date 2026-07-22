import { createClient } from '@supabase/supabase-js';

// Chave pública (anon) — segura para o browser, protegida pelas policies de RLS
// definidas em drop_secreto_schema.sql (leitura pública só de produtos aprovados).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
