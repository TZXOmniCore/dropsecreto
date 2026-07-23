import Link from 'next/link';
import type { Produto } from '@/lib/types';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function RankingList({ produtos }: { produtos: Produto[] }) {
  return (
    <ol className="divide-y divide-line rounded-2xl border border-line">
      {produtos.map((p, i) => (
        <li key={p.id}>
          <Link
            href={`/produto/${p.id}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-bg-raised/40"
          >
            <span className="mono-num w-6 shrink-0 text-right text-ink-faint">{i + 1}</span>
            <img
              src={p.imagemUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg bg-bg-raised object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-primary">{p.nome}</p>
              <p className="mono-num text-xs text-ink-secondary">{formatarPreco(p.precoAtual)}</p>
            </div>
            <span className="mono-num shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent">
              {p.dropScore}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
