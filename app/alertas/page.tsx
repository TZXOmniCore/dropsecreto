import { AlertasClient } from './AlertasClient';

// Mesma razão do favoritos/page.tsx: página de estado pessoal (alertas
// salvos no navegador de cada pessoa), sem conteúdo público único pra
// indexar -> noindex. Lógica idêntica, só movida pra AlertasClient.tsx
// porque 'use client' não pode exportar metadata.
export const metadata = {
  title: 'Alertas de preço — Drop Secreto',
  robots: { index: false, follow: true },
};

export default function AlertasPage() {
  return <AlertasClient />;
}
