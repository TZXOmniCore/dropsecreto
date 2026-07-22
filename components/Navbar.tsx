'use client';

import { Search } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
          <span className="font-display text-lg font-bold tracking-tight text-ink-primary">
            Drop Secreto
          </span>
        </a>

        <div className="relative hidden flex-1 max-w-xl md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Buscar produto, marca ou categoria"
            className="w-full rounded-full border border-line bg-bg-raised/60 py-2.5 pl-10 pr-4 text-sm text-ink-primary placeholder:text-ink-secondary outline-none focus-visible:border-accent"
          />
        </div>

        <nav className="ml-auto hidden items-center gap-6 text-sm text-ink-secondary md:flex">
          <a href="/ranking" className="transition-colors hover:text-ink-primary">
            Ranking
          </a>
          <a href="/favoritos" className="transition-colors hover:text-ink-primary">
            Favoritos
          </a>
          <a href="/alertas" className="transition-colors hover:text-ink-primary">
            Alertas
          </a>
        </nav>

        <button className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg-base transition-opacity hover:opacity-90">
          Entrar
        </button>
      </div>
    </header>
  );
}
