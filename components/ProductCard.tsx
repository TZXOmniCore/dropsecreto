'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { Produto } from '@/lib/types';
import { ehFavorito, alternarFavorito } from '@/lib/favorites';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function estiloDoScore(classificacao: Produto['classificacao']) {
  switch (classificacao) {
    case 'Excelente':
      return 'border-accent/40 bg-accent/15 text-accent';
    case 'Boa':
      return 'border-accent/20 bg-accent/8 text-accent/90';
    case 'Regular':
      return 'border-line bg-ink-secondary/10 text-ink-secondary';
    case 'Ruim':
      return 'border-danger/30 bg-danger/10 text-danger';
  }
}

function Sparkline({ dados }: { dados: number[] }) {
  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const amplitude = max - min || 1;

  const pontos = dados
    .map((v, i) => {
      const x = (i / (dados.length - 1)) * 100;
      const y = 22 - ((v - min) / amplitude) * 20;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 24" className="h-6 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pontos} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent/70" />
    </svg>
  );
}

export function ProductCard({ produto }: { produto: Produto }) {
  const [favoritado, setFavoritado] = useState(false);

  useEffect(() => {
    setFavoritado(ehFavorito(produto.id));
  }, [produto.id]);

  function alternarClique(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const atualizados = alternarFavorito(produto.id);
    setFavoritado(atualizados.includes(produto.id));
  }

  const desconto = produto.precoAntigo
    ? Math.round(((produto.precoAntigo - produto.precoAtual) / produto.precoAntigo) * 100)
    : 0;

  return (
    
      <a       href={produto.linkAfiliado}
      className="glass group flex flex-col gap-3 rounded-2xl p-4 shadow-card transition-transform hover:-translate-y-0.5 hover:border-accent/30"
    >
      <div className="relative overflow-hidden rounded-xl bg-bg-raised">
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div
          className={`absolute left-2 top-2 flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium mono-num ${estiloDoScore(
            produto.classificacao
          )}`}
        >
          {produto.dropScore}
          <span className="font-body font-normal opacity-70">score</span>
        </div>

        <button
          type="button"
          onClick={alternarClique}
          aria-label={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg-base/70 backdrop-blur-sm transition-colors hover:bg-bg-base"
        >
          <Heart className={`h-4 w-4 ${favoritado ? 'fill-accent text-accent' : 'text-ink-secondary'}`} />
        </button>

        {desconto > 0 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-bg-base/80 px-2 py-1 text-xs font-medium text-accent mono-num">
            -{desconto}%
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="line-clamp-2 text-sm text-ink-primary">{produto.nome}</h3>

        <div className="flex items-baseline gap-2">
          <span className="mono-num text-lg font-semibold text-ink-primary">
            {formatarPreco(produto.precoAtual)}
          </span>
          {produto.precoAntigo && (
            <span className="mono-num text-xs text-ink-faint line-through">
              {formatarPreco(produto.precoAntigo)}
            </span>
          )}
        </div>

        <Sparkline dados={produto.historico90d} />

        <div className="flex flex-wrap gap-1.5 text-[11px] text-ink-secondary">
          {produto.lojaOficial && (
            <span className="rounded-full border border-line px-2 py-0.5">loja oficial</span>
          )}
          {produto.freteGratis && (
            <span className="rounded-full border border-line px-2 py-0.5">frete grátis</span>
          )}
          {produto.temCupom && (
            <span className="rounded-full border border-accent/30 px-2 py-0.5 text-accent/90">
              cupom disponível
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
