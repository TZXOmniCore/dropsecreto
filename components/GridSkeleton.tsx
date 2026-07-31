// Skeleton de carregamento — mostrado automaticamente pelo Next.js
// (convenção loading.tsx) enquanto a página do servidor carrega, no lugar
// de tela branca ou spinner solto.
export function GridSkeleton({ itens = 12 }: { itens?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="glass flex animate-pulse flex-col gap-3 rounded-2xl p-4">
          <div className="aspect-square rounded-xl bg-bg-raised" />
          <div className="h-3 w-4/5 rounded bg-bg-raised" />
          <div className="h-4 w-1/2 rounded bg-bg-raised" />
          <div className="h-3 w-2/3 rounded bg-bg-raised" />
        </div>
      ))}
    </div>
  );
}
