'use client';

import { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  obterAlertas,
  salvarAlerta,
  removerAlerta,
  pedirPermissaoNotificacao,
  type AlertaLocal,
} from '@/lib/notifications';

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<AlertaLocal[]>([]);
  const [termo, setTermo] = useState('');
  const [precoAlvo, setPrecoAlvo] = useState('');
  const [permissao, setPermissao] = useState<NotificationPermission>('default');

  useEffect(() => {
    setAlertas(obterAlertas());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissao(Notification.permission);
    }
  }, []);

  async function criarAlerta(e: React.FormEvent) {
    e.preventDefault();
    if (!termo.trim() || !precoAlvo) return;

    const resultado = await pedirPermissaoNotificacao();
    setPermissao(resultado);

    const atualizados = salvarAlerta({ termo: termo.trim(), precoAlvo: Number(precoAlvo) });
    setAlertas(atualizados);
    setTermo('');
    setPrecoAlvo('');
  }

  function excluir(id: string) {
    setAlertas(removerAlerta(id));
  }

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Alertas de preço</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Sem login: o alerta fica salvo neste navegador e o aviso chega por
          notificação, sem precisar de e-mail.
        </p>

        {permissao === 'denied' && (
          <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
            As notificações estão bloqueadas nas configurações do navegador.
            Permita notificações para este site para receber os alertas.
          </p>
        )}

        <form onSubmit={criarAlerta} className="glass mt-6 flex flex-col gap-4 rounded-2xl p-5">
          <div>
            <label className="mb-1.5 block text-xs text-ink-secondary">
              O que você está procurando
            </label>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Ex: SSD 1TB, Mouse Gamer, RTX 4060"
              className="w-full rounded-lg border border-line bg-bg-raised/60 px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-faint outline-none focus-visible:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-ink-secondary">
              Avisar quando o preço cair até
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-raised/60 px-3 py-2.5 focus-within:border-accent">
              <span className="text-sm text-ink-faint">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precoAlvo}
                onChange={(e) => setPrecoAlvo(e.target.value)}
                placeholder="250,00"
                className="w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg-base transition-opacity hover:opacity-90"
          >
            Criar alerta
          </button>
        </form>

        {alertas.length > 0 && (
          <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
            {alertas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm text-ink-primary">{a.termo}</p>
                    <p className="mono-num text-xs text-ink-secondary">
                      até R$ {a.precoAlvo.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => excluir(a.id)}
                  aria-label="Excluir alerta"
                  className="text-ink-faint transition-colors hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  );
}
