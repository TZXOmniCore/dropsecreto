// Gerador de número pseudoaleatório baseado em crypto.getRandomValues.
// Usado só pra coisas sem nenhuma implicação de segurança (embaralhar a
// vitrine, sortear variante de teste A/B) — nada de token, senha ou id.
// Sem fallback pra Math.random(): o resto do código já assume crypto
// disponível (ver crypto.randomUUID() em lib/notifications.ts), e manter
// um fallback com Math.random() só reintroduz o hotspot de segurança do
// Sonar que essa função existe pra evitar.
export function randomFloat(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / (0xffffffff + 1);
}
