'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Trophy, Heart, LayoutGrid, Sparkles } from 'lucide-react';

// Lista fixa das 16 categorias — serve de base pro autocomplete da busca
// sem precisar de nenhuma consulta extra ao banco (a taxonomia é
// conhecida e estável; ver lib/produtos.ts CATEGORIAS_PADRAO).
const CATEGORIAS_SUGESTAO = [
  { nome: 'Celulares', slug: 'celulares' },
  { nome: 'Informática', slug: 'informatica' },
  { nome: 'SSD', slug: 'ssd' },
  { nome: 'Memória RAM', slug: 'memoria-ram' },
  { nome: 'Notebook', slug: 'notebook' },
  { nome: 'Monitor', slug: 'monitor' },
  { nome: 'Gamer', slug: 'gamer' },
  { nome: 'Ferramentas', slug: 'ferramentas' },
  { nome: 'Casa', slug: 'casa' },
  { nome: 'Cozinha', slug: 'cozinha' },
  { nome: 'Beleza', slug: 'beleza' },
  { nome: 'Moda', slug: 'moda' },
  { nome: 'Carro', slug: 'carro' },
  { nome: 'Pets', slug: 'pets' },
  { nome: 'Crianças', slug: 'criancas' },
  { nome: 'Smart Home', slug: 'smart-home' },
];

export function Navbar() {
  const router = useRouter();
  const [termo, setTermo] = useState('');
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = termo.trim();
    if (!limpo) return;
    setSugestoesAbertas(false);
    router.push(`/busca?q=${encodeURIComponent(limpo)}`);
  }

  const sugestoes =
    termo.trim().length >= 2
      ? CATEGORIAS_SUGESTAO.filter((c) => c.nome.toLowerCase().includes(termo.trim().toLowerCase())).slice(0, 5)
      : [];

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4">
        <a href="/" className="flex items-center gap-3 shrink-0">
          <Image src="/icon-192.png" alt="" width={52} height={52} className="shrink-0" />
          <span className="font-display text-2xl font-bold leading-[1.05] tracking-tight">
            <span className="block text-ink-primary">Drop</span>
            <span className="block text-accent">Secreto</span>
          </span>
        </a>

        <nav className="ml-auto flex items-center gap-4 text-sm text-ink-secondary sm:gap-6">
          <a href="/melhores-da-semana" className="flex items-center gap-1.5 transition-colors hover:text-ink-primary">
            <Sparkles className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Da semana</span>
          </a>
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

        <form
          onSubmit={buscar}
          className="relative order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xl"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setSugestoesAbertas(true);
            }}
            onFocus={() => setSugestoesAbertas(true)}
            onBlur={() => setTimeout(() => setSugestoesAbertas(false), 150)}
            placeholder="Buscar produto, marca ou categoria"
            className="w-full rounded-full border border-line bg-bg-raised/60 py-2.5 pl-10 pr-4 text-sm text-ink-primary placeholder:text-ink-secondary outline-none focus-visible:border-accent"
          />

          {sugestoesAbertas && sugestoes.length > 0 && (
            <ul className="glass absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-2xl shadow-card">
              {sugestoes.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/categoria/${c.slug}`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-secondary transition-colors hover:bg-bg-raised/60 hover:text-ink-primary"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    {c.nome}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </form>
      </div>
    </header>
  );
}
