const ESTATISTICAS = [
  { valor: '12.482', rotulo: 'produtos analisados hoje' },
  { valor: '63%', rotulo: 'taxa de rejeição do motor' },
  { valor: '18', rotulo: 'categorias monitoradas' },
];

export function TrustBar() {
  return (
    <div className="border-b border-line bg-bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-3 px-6 py-4">
        {ESTATISTICAS.map((e) => (
          <div key={e.rotulo} className="flex items-baseline gap-2">
            <span className="mono-num text-sm font-medium text-ink-primary">{e.valor}</span>
            <span className="text-xs text-ink-secondary">{e.rotulo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
