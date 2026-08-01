'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, AlertTriangle, Sparkles, TrendingDown } from 'lucide-react';
import type { Produto } from '@/lib/types';
import { ehFavorito, alternarFavorito } from '@/lib/favorites';
import { produtoPoucoVendido, produtoENovo, textoMenorPreco } from '@/lib/produto-badges';
import { foiVisitado, registrarVisita } from '@/lib/visited';
import { tempoRelativo } from '@/lib/format';
import { eventos } from '@/lib/analytics';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export function ProductCard({
  produto,
  layout = 'grade',
}: {
  produto: Produto;
  layout?: 'grade' | 'lista';
}) {
  const [favoritado, setFavoritado] = useState(false);
  const [visitado, setVisitado] = useState(false);

  useEffect(() => {
    setFavoritado(ehFavorito(produto.id));
    setVisitado(foiVisitado(produto.id));
  }, [produto.id]);

  function alternarClique(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const atualizados = alternarFavorito(produto.id);
    setFavoritado(atualizados.includes(produto.id));
    eventos.favoritar(produto.id, atualizados.includes(produto.id));
  }

  const desconto = produto.precoAntigo
    ? Math.round(((produto.precoAntigo - produto.precoAtual) / produto.precoAntigo) * 100)
    : 0;

  const ePoucoVendido = produtoPoucoVendido(produto);
  const eNovo = produtoENovo(produto);
  const menorPreco = textoMenorPreco(produto);

  const badges = (
    <div className="flex flex-wrap gap-1.5 text-[11px] text-ink-secondary">
      {eNovo && (
        <span className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
          <Sparkles className="h-3 w-3" />
          novo
        </span>
      )}
      {menorPreco && (
        <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
          <TrendingDown className="h-3 w-3" />
          {menorPreco}
        </span>
      )}
      {ePoucoVendido && (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          poucas vendas
        </span>
      )}
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
  );

  const favoritarBotao = (
    <button
      type="button"
      onClick={alternarClique}
      aria-label={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-base/70 backdrop-blur-sm transition-colors hover:bg-bg-base"
    >
      <Heart className={`h-4 w-4 ${favoritado ? 'fill-accent text-accent' : 'text-ink-secondary'}`} />
    </button>
  );

  if (layout === 'lista') {
    return (
      <Link
        href={`/produto/${produto.id}`}
        onClick={() => registrarVisita(produto.id)}
        className="group block"
      >
        <div
          className={`glass flex gap-3 rounded-2xl p-3 shadow-card transition-transform group-hover:border-accent/30 ${
            visitado ? 'opacity-80' : ''
          }`}
        >
          <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-bg-raised sm:w-32">
            <Image src={produto.imagemUrl} alt={produto.nome} fill sizes="128px" className="object-cover" />
            {desconto > 0 && (
              <div className="absolute bottom-1 right-1 rounded-full bg-bg-base/80 px-1.5 py-0.5 text-[10px] font-medium text-accent mono-num">
                -{desconto}%
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm text-ink-primary">{produto.nome}</h3>
              <div className="shrink-0">{favoritarBotao}</div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="mono-num text-base font-semibold text-ink-primary">
                {formatarPreco(produto.precoAtual)}
              </span>
              {produto.precoAntigo && (
                <span className="mono-num text-xs text-ink-faint line-through">
                  {formatarPreco(produto.precoAntigo)}
                </span>
              )}
            </div>

            {badges}
            <p className="text-[11px] text-ink-faint">verificado {tempoRelativo(produto.atualizadoEm)}</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/produto/${produto.id}`}
      onClick={() => registrarVisita(produto.id)}
      className="group block"
    >
      {/* Card completo em todas as telas — mobile igual ao desktop
          (quadradinho com foto, nome, preço e infos embaixo). Produto já
          visitado fica com opacidade levemente menor, só pra ajudar a
          não se perder rolando de novo pela mesma lista — sem esconder
          nem remover nada. */}
      <div
        className={`glass flex flex-col gap-3 rounded-2xl p-4 shadow-card transition-transform group-hover:-translate-y-0.5 group-hover:border-accent/30 ${
          visitado ? 'opacity-80' : ''
        }`}
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-raised">
          <Image
            src={produto.imagemUrl}
            alt={produto.nome}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute right-2 top-2">{favoritarBotao}</div>

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

          {badges}

          <p className="text-[11px] text-ink-faint">verificado {tempoRelativo(produto.atualizadoEm)}</p>
        </div>
      </div>
    </Link>
  );
}
