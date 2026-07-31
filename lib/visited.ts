// Marca visual discreta em produto que a pessoa já abriu — ajuda a não
// se perder rolando de novo pela mesma lista. Guarda só os ids, local ao
// navegador (mesmo padrão de favorites.ts e category-behavior.ts).
const CHAVE = 'drop-secreto:produtos-visitados';
const LIMITE = 300; // não deixa crescer pra sempre

export function registrarVisita(produtoId: string) {
  if (typeof window === 'undefined') return;
  try {
    const visitados = obterVisitados();
    if (!visitados.includes(produtoId)) {
      const atualizados = [produtoId, ...visitados].slice(0, LIMITE);
      window.localStorage.setItem(CHAVE, JSON.stringify(atualizados));
    }
  } catch {
    // localStorage indisponível — segue sem quebrar nada
  }
}

export function obterVisitados(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function foiVisitado(produtoId: string): boolean {
  return obterVisitados().includes(produtoId);
}
