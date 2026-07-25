'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import type { Produto } from '@/lib/types';

function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularDesconto(p: Produto) {
  if (!p.precoAntigo) return 0;
  return Math.round(((p.precoAntigo - p.precoAtual) / p.precoAntigo) * 100);
}

// O quadro ao lado do texto de abertura mostra os 3 produtos com maior
// desconto de toda a plataforma no momento — não é mais uma demonstração
// fake, é dado real (ver buscarTop3MaioresDescontos em lib/produtos.ts).
export function ScannerHero({ top3 }: { top3: Produto[] }) {
  const reduzMovimento = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 md:py-20 lg:gap-12 lg:py-28">
        <div className="flex flex-col justify-center">
          <h1 className="font-display text-3xl font-bold leading-[1.05] text-ink-primary sm:text-4xl md:text-5xl">
            A internet promete desconto.
            <br />
            <span className="text-accent">A gente confirma.</span>
          </h1>
          <p className="mt-5 max-w-md text-ink-secondary">
            Todo produto que aparece aqui passou por uma análise automática de
            preço, avaliação, vendas e histórico dos últimos 90 dias. O resto,
            a gente descarta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#ofertas"
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-bg-base transition-opacity hover:opacity-90"
            >
              Ver ofertas verificadas
            </a>
            <Link
              href="/como-funciona"
              className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-primary transition-colors hover:border-accent/50"
            >
              Como o Drop Score funciona
            </Link>
          </div>
        </div>

        <div className="relative flex flex-col justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-bg-surface/60 p-5">
          <p className="mb-1 text-xs uppercase tracking-wide text-ink-faint">
            Maiores descontos agora
          </p>

          {!reduzMovimento && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-accent to-transparent"
              style={{ boxShadow: '0 0 20px 2px rgba(0,230,118,0.5)' }}
              animate={{ left: ['-2%', '102%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          )}

          {top3.length === 0 ? (
            <p className="rounded-xl border border-line bg-bg-raised/40 px-4 py-3 text-sm text-ink-secondary">
              Analisando produtos — os maiores descontos aparecem aqui em instantes.
            </p>
          ) : (
            top3.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Link
                  href={`/produto/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 transition-colors hover:bg-accent/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={p.imagemUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg bg-bg-raised object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-primary">{p.nome}</p>
                      <p className="mono-num text-xs text-ink-faint">{formatarPreco(p.precoAtual)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
                    <span className="mono-num text-sm font-medium text-accent">
                      -{calcularDesconto(p)}%
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
