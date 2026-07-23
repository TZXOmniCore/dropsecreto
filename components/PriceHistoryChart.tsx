function formatarPreco(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PriceHistoryChart({ dados }: { dados: number[] }) {
  const min = Math.min(...dados);
  const max = Math.max(...dados);
  const media = dados.reduce((a, b) => a + b, 0) / dados.length;
  const amplitude = max - min || 1;
  const atual = dados[dados.length - 1];

  const alturaGrafico = 120;
  const pontos = dados
    .map((v, i) => {
      const x = (i / (dados.length - 1)) * 100;
      const y = alturaGrafico - ((v - min) / amplitude) * (alturaGrafico - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  const yAtual = alturaGrafico - ((atual - min) / amplitude) * (alturaGrafico - 10) - 5;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-ink-primary">Histórico de preço · últimos 90 dias</h3>
        <div className="flex gap-4 text-xs text-ink-secondary">
          <span>
            menor <span className="mono-num text-ink-primary">{formatarPreco(min)}</span>
          </span>
          <span>
            média <span className="mono-num text-ink-primary">{formatarPreco(media)}</span>
          </span>
          <span>
            maior <span className="mono-num text-ink-primary">{formatarPreco(max)}</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 100 ${alturaGrafico}`} className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline
          points={pontos}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          className="text-accent"
        />
        <circle cx="100" cy={yAtual} r="1.5" vectorEffect="non-scaling-stroke" className="fill-accent" />
      </svg>
    </div>
  );
}
