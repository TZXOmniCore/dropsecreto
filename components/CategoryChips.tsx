import type { Categoria } from '@/lib/types';

export function CategoryChips({ categorias }: { categorias: Categoria[] }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-6 py-5 md:px-0">
      {categorias.map((c) => (
        <a
          key={c.id}
          href={`/categoria/${c.slug}`}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink-secondary transition-colors hover:border-accent/50 hover:text-ink-primary"
        >
          {c.nome}
        </a>
      ))}
    </div>
  );
}
