import { FavoritosClient } from './FavoritosClient';

// Página de estado pessoal (favoritos salvos no navegador de cada
// pessoa) — sem conteúdo público único pra indexar, então noindex.
// A lógica em si (client component) não mudou, só foi movida pra
// FavoritosClient.tsx: componente marcado com 'use client' não pode
// exportar metadata no Next.js, então esse wrapper (server component)
// existe só pra isso.
export const metadata = {
  title: 'Seus favoritos — Drop Secreto',
  robots: { index: false, follow: true },
};

export default function FavoritosPage() {
  return <FavoritosClient />;
}
