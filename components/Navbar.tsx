'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trophy, Heart, LayoutGrid } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState('');

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = termo.trim();
    if (!limpo) return;
    router.push(`/busca?q=${encodeURIComponent(limpo)}`);
  }

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-glow" />
          <span className="font-display text-lg font-bold leading-[1.05] tracking-tight">
            <span className="block text-ink-primary">Drop</span>
            <span className="block text-accent">Secreto</span>
          </span>
        </a>

        <nav className="ml-auto flex items-center gap-4 text-sm text-ink-secondary sm:gap-6">
          <a href="/ranking" className="flex items-center gap-1.5 transition-colors hover:text-ink-primary">
            <Trophy className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Ranking</span>
          </a>
          <a href="/favoritos" className="flex items-center gap-1.5 transition-colors hover:text-ink-primary">
            <Heart className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Favoritos</span>
          </a>
          <a href="/categorias" className="flex items-center gap-1.5 transition-colors hover:text-ink-primary">
            <LayoutGrid className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Categorias</span>
          </a>
        </nav>

        <form onSubmit={buscar} className="relative order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar produto, marca ou categoria"
            className="w-full rounded-full border border-line bg-bg-raised/60 py-2.5 pl-10 pr-4 text-sm text-ink-primary placeholder:text-ink-secondary outline-none focus-visible:border-accent"
          />
        </form>
      </div>
    </header>
  );
}
