'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Produto } from '@/lib/types';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Cartao({ produto }: { produto: Produto }) {
  const desconto = produto.precoAntigo
    ? Math.round(((produto.precoAntigo - produto.precoAtual) / produto.precoAntigo) * 100)
    : 0;

  return (
    <Link
      href={`/produto/${produto.id}`}
      className="glass flex w-56 shrink-0 items-center gap-3 rounded-2xl p-3 shadow-card transition-colors hover:border-accent/30 sm:w-64"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-bg-raised">
        <Image src={produto.imagemUrl} alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-ink-primary">{produto.nome}</p>
        <p className="mono-num text-sm text-ink-primary">{formatarPreco(produto.precoAtual)}</p>
      </div>
      {desconto > 0 && (
        <span className="mono-num shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-xs text-accent">
          -{desconto}%
        </span>
      )}
    </Link>
  );
}

// Passagem automática horizontal (tipo ticker), pra dar sensação de "site
// sempre vivo" na seção de últimas quedas de preço. Pausa no hover/toque
// (a pessoa consegue clicar sem o carrossel fugir do dedo) e a lista é
// duplicada uma vez pra o loop ficar contínuo, sem "pulo" perceptível.
export function CarrosselOfertas({ produtos }: { produtos: Produto[] }) {
  const [pausado, setPausado] = useState(false);
  const dobrado = [...produtos, ...produtos];
  // Duração proporcional à quantidade de itens, pra velocidade ficar
  // parecida não importa quantos produtos vierem.
  const duracaoSegundos = Math.max(produtos.length * 6, 10);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={() => setPausado(true)}
      onTouchEnd={() => setPausado(false)}
    >
      <motion.div
        className="flex gap-3"
        animate={{ x: pausado ? undefined : ['0%', '-50%'] }}
        transition={{ duration: duracaoSegundos, ease: 'linear', repeat: Infinity }}
      >
        {dobrado.map((p, i) => (
          <Cartao key={`${p.id}-${i}`} produto={p} />
        ))}
      </motion.div>
    </div>
  );
}
