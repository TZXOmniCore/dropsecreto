'use client';

import { ShoppingCart } from 'lucide-react';
import { eventos } from '@/lib/analytics';

export function BotaoComprar({
  produtoId,
  produtoNome,
}: {
  readonly produtoId: string;
  readonly produtoNome: string;
}) {
  return (
    <a
      href={`/go/${produtoId}`}
      rel="nofollow noopener"
      onClick={() => eventos.cliqueOferta(produtoId, produtoNome)}
      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90"
    >
      <ShoppingCart className="h-4 w-4" />
      Comprar na loja
    </a>
  );
}
