'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Elemento de assinatura da página: em vez de um número grande genérico,
// o hero DEMONSTRA a tese do produto — um "scanner" que separa promoção
// real de preço inflado, em tempo real.
const CANDIDATOS = [
  {
    nome: 'Fone sem fio "premium"',
    preco: 'R$ 249,90',
    motivo: 'preço "de" 3x acima do maior já registrado',
    aprovado: false,
  },
  {
    nome: 'Power bank 30.000mAh',
    preco: 'R$ 89,90',
    motivo: 'loja sem histórico de vendas',
    aprovado: false,
  },
  {
    nome: 'SSD NVMe 1TB',
    preco: 'R$ 289,90',
    motivo: null,
    aprovado: true,
    score: 96,
  },
] as const;

export function ScannerHero() {
  const reduzMovimento = useReducedMotion();
  const [scoreExibido, setScoreExibido] = useState(reduzMovimento ? 96 : 0);

  useEffect(() => {
    if (reduzMovimento) return;
    const alvo = 96;
    const id = setInterval(() => {
      setScoreExibido((atual) => {
        if (atual >= alvo) {
          clearInterval(id);
          return atual;
        }
        return atual + 4;
      });
    }, 60);
    return () => clearInterval(id);
  }, [reduzMovimento]);

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-ink-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            motor de análise ativo
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-ink-primary md:text-5xl">
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
            <a
              href="#como-funciona"
              className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-primary transition-colors hover:border-accent/50"
            >
              Como o Drop Score funciona
            </a>
          </div>
        </div>

        <div className="relative flex flex-col justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-bg-surface/60 p-5">
          {!reduzMovimento && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-accent to-transparent"
              style={{ boxShadow: '0 0 20px 2px rgba(0,230,118,0.5)' }}
              animate={{ left: ['-2%', '102%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          )}

          {CANDIDATOS.map((c, i) => (
            <motion.div
              key={c.nome}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                c.aprovado
                  ? 'border-accent/40 bg-accent/5'
                  : 'grayscale border-line bg-bg-raised/40'
              }`}
            >
              <div>
                <p className={`text-sm ${c.aprovado ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                  {c.nome}
                </p>
                <p className="mono-num text-xs text-ink-faint">{c.preco}</p>
              </div>

              {c.aprovado ? (
                <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1">
                  <span className="mono-num text-sm font-medium text-accent">{scoreExibido}</span>
                  <span className="text-[10px] uppercase tracking-wide text-accent/80">score</span>
                </div>
              ) : (
                <span className="text-xs text-danger/80">✕ {c.motivo}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
