'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import type { Produto } from '@/lib/types';
import { buscarProdutosPorIds } from '@/lib/produtos';
import { obterFavoritos } from '@/lib/favorites';

export default function FavoritosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const ids = obterFavoritos();
    buscarProdutosPorIds(ids).then((resultado) => {
      setProdutos(resultado);
      setCarregado(true);
    });
  }, []);

  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-primary">Seus favoritos</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Salvos neste navegador — sem login, sem cadastro.
        </p>

        {carregado && produtos.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-bg-surface">
              <Heart className="h-6 w-6 text-ink-secondary" />
            </div>
            <p className="max-w-sm text-sm text-ink-secondary">
              Você ainda não favoritou nenhum produto. Clique no coração em
              qualquer card de oferta para salvar aqui.
            </p>
          </div>
        )}

        {produtos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
