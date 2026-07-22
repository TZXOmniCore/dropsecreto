'use client';

import { useEffect, useState } from 'react';
import type { Produto } from '@/lib/types';
import { ProductCard } from './ProductCard';

function proximaMeiaNoite() {
  const agora = new Date();
  const meiaNoite = new Date(agora);
  meiaNoite.setHours(24, 0, 0, 0);
  return meiaNoite;
}

function useContagemRegressiva() {
  const [restante, setRestante] = useState(() => proximaMeiaNoite().getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setRestante(proximaMeiaNoite().getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const total = Math.max(restante, 0);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function FlashDeals({ produtos }: { produtos: Produto[] }) {
  const relogio = useContagemRegressiva();

  if (produtos.length === 0) return null;

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.03] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-primary">Flash Deals</h2>
          <p className="text-sm text-ink-secondary">Score alto, tempo curto. Some da lista quando o relógio zera.</p>
        </div>
        <div className="mono-num rounded-full border border-accent/30 bg-bg-base/60 px-4 py-2 text-lg text-accent">
          {relogio}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {produtos.map((p) => (
          <ProductCard key={p.id} produto={p} />
        ))}
      </div>
    </section>
  );
}
