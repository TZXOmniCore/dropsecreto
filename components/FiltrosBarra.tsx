'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';

const OPCOES_ORDENAR = [
  { valor: 'relevancia', rotulo: 'Mais relevante' },
  { valor: 'desconto', rotulo: 'Maior desconto' },
  { valor: 'menor-preco', rotulo: 'Menor preço' },
  { valor: 'avaliacao', rotulo: 'Melhor avaliação' },
] as const;

const OPCOES_DESCONTO = [0, 50, 70, 90];

// Monta a URL atual trocando só os parâmetros passados, mantendo o resto
// (ex.: trocar "ordenar" sem perder o "desconto" que já estava marcado).
// Sempre volta pra página 1 quando um filtro muda — não faria sentido
// manter "página 4" depois de trocar o critério.
function construirHref(pathname: string, atuais: URLSearchParams, mudancas: Record<string, string | null>) {
  const params = new URLSearchParams(atuais.toString());
  for (const [chave, valor] of Object.entries(mudancas)) {
    if (valor === null) params.delete(chave);
    else params.set(chave, valor);
  }
  params.delete('pagina');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function Controles({
  pathname,
  atuais,
}: {
  readonly pathname: string;
  readonly atuais: URLSearchParams;
}) {
  const ordenarAtual = atuais.get('ordenar') ?? 'relevancia';
  const descontoAtual = Number(atuais.get('desconto') ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-medium text-ink-faint">Ordenar por</p>
        <div className="flex flex-wrap gap-2">
          {OPCOES_ORDENAR.map((opcao) => (
            <Link
              key={opcao.valor}
              href={construirHref(pathname, atuais, {
                ordenar: opcao.valor === 'relevancia' ? null : opcao.valor,
              })}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                ordenarAtual === opcao.valor
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-line text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {opcao.rotulo}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-ink-faint">Desconto mínimo</p>
        <div className="flex flex-wrap gap-2">
          {OPCOES_DESCONTO.map((valor) => (
            <Link
              key={valor}
              href={construirHref(pathname, atuais, { desconto: valor === 0 ? null : String(valor) })}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                descontoAtual === valor
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-line text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {valor === 0 ? 'Qualquer' : `${valor}%+`}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-ink-faint">Faixa de preço (R$)</p>
        <form className="flex items-center gap-2" action={pathname} method="GET">
          {/* Preserva os outros filtros já ativos como campos ocultos —
              esse form só existe pra deixar preço min/max digitável, o
              resto continua sendo link puro. */}
          {Array.from(atuais.entries())
            .filter(([chave]) => !['precoMin', 'precoMax', 'pagina'].includes(chave))
            .map(([chave, valor]) => (
              <input key={chave} type="hidden" name={chave} value={valor} />
            ))}
          <input
            type="number"
            name="precoMin"
            min={0}
            placeholder="mín"
            defaultValue={atuais.get('precoMin') ?? ''}
            className="w-20 rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-ink-primary outline-none focus:border-accent/50"
          />
          <span className="text-ink-faint">—</span>
          <input
            type="number"
            name="precoMax"
            min={0}
            placeholder="máx"
            defaultValue={atuais.get('precoMax') ?? ''}
            className="w-20 rounded-lg border border-line bg-transparent px-2 py-1.5 text-xs text-ink-primary outline-none focus:border-accent/50"
          />
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-accent/50 hover:text-ink-primary"
          >
            Aplicar
          </button>
        </form>
      </div>
    </div>
  );
}

export function FiltrosBarra() {
  const pathname = usePathname();
  const atuais = useSearchParams();
  const [painelAberto, setPainelAberto] = useState(false);

  const filtrosAtivos =
    (atuais.get('ordenar') && atuais.get('ordenar') !== 'relevancia' ? 1 : 0) +
    (Number(atuais.get('desconto') ?? 0) > 0 ? 1 : 0) +
    (atuais.get('precoMin') ? 1 : 0) +
    (atuais.get('precoMax') ? 1 : 0);

  return (
    <>
      {/* Desktop/tablet: barra fixa ao rolar, sempre visível */}
      <div className="glass sticky top-[64px] z-10 mb-6 hidden rounded-2xl p-4 md:block">
        <Controles pathname={pathname} atuais={atuais} />
      </div>

      {/* Mobile: botão que abre painel subindo de baixo, em vez de
          empurrar a tela toda com os controles */}
      <div className="mb-4 md:hidden">
        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-primary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {filtrosAtivos > 0 && (
            <span className="mono-num rounded-full bg-accent px-1.5 text-xs text-bg-base">
              {filtrosAtivos}
            </span>
          )}
        </button>

        {painelAberto && (
          <dialog
            open
            aria-modal="true"
            aria-label="Filtros"
            className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end border-0 bg-transparent p-0"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setPainelAberto(false)}
              aria-hidden
            />
            <div className="glass relative w-full rounded-t-3xl p-5 pb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-ink-primary">Filtros</h2>
                <button
                  type="button"
                  onClick={() => setPainelAberto(false)}
                  aria-label="Fechar filtros"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Controles pathname={pathname} atuais={atuais} />
            </div>
          </dialog>
        )}
      </div>
    </>
  );
}
