const CHAVE = 'drop-secreto:favoritos';

export function obterFavoritos(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function ehFavorito(produtoId: string): boolean {
  return obterFavoritos().includes(produtoId);
}

export function alternarFavorito(produtoId: string): string[] {
  const atuais = obterFavoritos();
  const atualizados = atuais.includes(produtoId)
    ? atuais.filter((id) => id !== produtoId)
    : [...atuais, produtoId];
  window.localStorage.setItem(CHAVE, JSON.stringify(atualizados));
  return atualizados;
}
