import Link from 'next/link';
import Image from 'next/image';
import type { Produto } from '@/lib/types';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeDoItem(p: Produto, variante: 'score' | 'desconto') {
  if (variante === 'desconto') {
    const desconto = p.precoAntigo
      ? Math.round(((p.precoAntigo - p.precoAtual) / p.precoAntigo) * 100)
      : 0;
    return `-${desconto}%`;
  }
  return `${p.dropScore} score`;
}

// Resume o nome do produto com "..." no final — usado no mobile pra evitar
// que nome muito longo empurre o badge de desconto pra fora da tela.
function truncarNome(nome: string, max = 28) {
  if (nome.length <= max) return nome;
  return `${nome.slice(0, max).trimEnd()}...`;
}

export function RankingList({
  produtos,
  variante = 'score',
  truncarNomeMobile = false,
}: {
  produtos: Produto[];
  variante?: 'score' | 'desconto';
  truncarNomeMobile?: boolean;
}) {
  return (
    <ol className="divide-y divide-line rounded-2xl border border-line">
      {produtos.map((p, i) => (
        <li key={p.id}>
          <Link
            href={`/produto/${p.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-raised/40 sm:gap-4"
          >
            <span className="mono-num w-5 shrink-0 text-right text-ink-faint sm:w-6">{i + 1}</span>
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg-raised">
              <Image src={p.imagemUrl} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-primary">
                {truncarNomeMobile ? (
                  <>
                    <span className="sm:hidden">{truncarNome(p.nome)}</span>
                    <span className="hidden sm:inline">{p.nome}</span>
                  </>
                ) : (
                  p.nome
                )}
              </p>
              <p className="mono-num text-xs text-ink-secondary">{formatarPreco(p.precoAtual)}</p>
            </div>
            <span className="mono-num shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs text-accent">
              {badgeDoItem(p, variante)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
