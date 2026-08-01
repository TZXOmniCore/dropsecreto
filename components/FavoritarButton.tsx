'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { ehFavorito, alternarFavorito } from '@/lib/favorites';

// Botão de favoritar da página do produto (separado do coraçãozinho do
// ProductCard, que já existe nos cards de listagem).
export function FavoritarButton({ produtoId }: { readonly produtoId: string }) {
  const [favoritado, setFavoritado] = useState(false);

  useEffect(() => {
    setFavoritado(ehFavorito(produtoId));
  }, [produtoId]);

  function alternar() {
    const atualizados = alternarFavorito(produtoId);
    setFavoritado(atualizados.includes(produtoId));
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-line transition-colors hover:border-accent/50"
    >
      <Heart className={`h-5 w-5 ${favoritado ? 'fill-accent text-accent' : 'text-ink-secondary'}`} />
    </button>
  );
}
