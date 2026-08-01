'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { salvarAlerta, pedirPermissaoNotificacao } from '@/lib/notifications';

export function AlertaProdutoInline({
  nomeProduto,
  precoAtual,
}: {
  readonly nomeProduto: string;
  readonly precoAtual: number;
}) {
  const [precoAlvo, setPrecoAlvo] = useState(String(Math.floor(precoAtual)));
  const [criado, setCriado] = useState(false);
  const [permissaoNegada, setPermissaoNegada] = useState(false);

  async function criarAlerta(e: React.FormEvent) {
    e.preventDefault();
    if (!precoAlvo) return;

    const resultado = await pedirPermissaoNotificacao();
    if (resultado === 'denied') {
      setPermissaoNegada(true);
      return;
    }

    salvarAlerta({ termo: nomeProduto, precoAlvo: Number(precoAlvo) });
    setCriado(true);
  }

  if (criado) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
        <Check className="h-4 w-4 shrink-0" />
        Alerta criado — avisamos quando o preço cair até {precoAlvo ? `R$ ${precoAlvo}` : 'esse valor'}.
        <Link href="/alertas" className="ml-auto shrink-0 underline underline-offset-2">
          ver alertas
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={criarAlerta} className="mt-3 flex flex-wrap items-center gap-2">
      <Bell className="h-4 w-4 shrink-0 text-ink-secondary" />
      <span className="text-sm text-ink-secondary">Avisar quando cair até</span>
      <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-raised/60 px-2.5 py-1.5">
        <span className="text-xs text-ink-faint">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={precoAlvo}
          onChange={(e) => setPrecoAlvo(e.target.value)}
          className="w-20 bg-transparent text-sm text-ink-primary outline-none"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-bg-base transition-opacity hover:opacity-90"
      >
        Criar alerta
      </button>
      {permissaoNegada && (
        <p className="w-full text-xs text-danger">
          As notificações estão bloqueadas nas configurações do navegador. Permita pra receber o aviso.
        </p>
      )}
    </form>
  );
}
