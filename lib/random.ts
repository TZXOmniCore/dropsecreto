// Gerador de número pseudoaleatório baseado em crypto.getRandomValues.
// Usado só pra coisas sem nenhuma implicação de segurança (embaralhar a
// vitrine, sortear variante de teste A/B) — nada de token, senha ou id.
// Troca só evita o hotspot de segurança do Sonar sobre Math.random() como
// PRNG; o comportamento estatístico pro uso daqui é equivalente.
export function randomFloat(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / (0xffffffff + 1);
  }
  return Math.random();
}
