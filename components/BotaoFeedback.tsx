'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquarePlus, X, Check } from 'lucide-react';
import { enviarFeedback, type TipoFeedback } from '@/lib/feedback';

const TIPOS: { valor: TipoFeedback; rotulo: string }[] = [
  { valor: 'oferta_errada', rotulo: 'Uma oferta está errada' },
  { valor: 'bug', rotulo: 'Encontrei um problema no site' },
  { valor: 'sugestao', rotulo: 'Tenho uma sugestão' },
  { valor: 'outro', rotulo: 'Outro assunto' },
];

// Canal de feedback que não depende de e-mail (o site ainda não tem um
// de verdade) — vai direto pro banco, só legível pela Dashboard do
// Supabase. Simples de propósito: sem isso, não existe nenhuma forma da
// pessoa reportar oferta ruim ou sugerir algo.
export function BotaoFeedback() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoFeedback>('oferta_errada');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!mensagem.trim()) return;
    setEnviando(true);
    const resultado = await enviarFeedback({ tipo, mensagem: mensagem.trim(), paginaUrl: pathname });
    setEnviando(false);
    if (resultado.ok) {
      setEnviado(true);
      setMensagem('');
      setTimeout(() => {
        setAberto(false);
        setEnviado(false);
      }, 1800);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 text-xs text-ink-secondary transition-colors hover:text-ink-primary"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Dar feedback
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} aria-hidden />
          <div className="glass relative w-full max-w-sm rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink-primary">Feedback</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {enviado ? (
              <p className="flex items-center gap-2 py-6 text-sm text-emerald-400">
                <Check className="h-4 w-4" />
                Obrigado! Recebemos sua mensagem.
              </p>
            ) : (
              <form onSubmit={enviar} className="flex flex-col gap-3">
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoFeedback)}
                  className="rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent/50"
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor} className="bg-bg-base">
                      {t.rotulo}
                    </option>
                  ))}
                </select>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Conta o que aconteceu..."
                  rows={4}
                  required
                  className="resize-none rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink-primary outline-none placeholder:text-ink-faint focus:border-accent/50"
                />
                <button
                  type="submit"
                  disabled={enviando}
                  className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
