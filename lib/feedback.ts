import { supabase } from './supabase';

export type TipoFeedback = 'oferta_errada' | 'sugestao' | 'bug' | 'outro';

export async function enviarFeedback(params: {
  tipo: TipoFeedback;
  mensagem: string;
  produtoId?: string;
  paginaUrl?: string;
}): Promise<{ ok: boolean }> {
  const { error } = await supabase.from('feedback').insert({
    tipo: params.tipo,
    mensagem: params.mensagem,
    produto_id: params.produtoId ?? null,
    pagina_url: params.paginaUrl ?? null,
  });

  if (error) {
    console.error('Erro ao enviar feedback:', error.message);
    return { ok: false };
  }
  return { ok: true };
}
