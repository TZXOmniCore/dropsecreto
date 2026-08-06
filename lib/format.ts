// Serializa um objeto pra uso dentro de <script type="application/ld+json">
// com dangerouslySetInnerHTML. JSON.stringify sozinho NÃO escapa "<" — se
// um dado de terceiro (ex.: nome de produto vindo do feed da Shopee, fora
// do nosso controle) contiver a sequência "</script>", o navegador fecha a
// tag ali e executa como script real qualquer coisa que vier depois (XSS
// armazenado). Trocar "<" por "\u003c" quebra essa sequência sem mudar o
// significado do JSON (JSON.parse entende \u003c normalmente).
export function jsonLdSeguro(dado: unknown): string {
  return JSON.stringify(dado).replace(/</g, '\\u003c');
}

// "Verificado há X horas" — helper pequeno e sem dependência externa.
export function tempoRelativo(dataIso: string): string {
  const diffMs = Date.now() - new Date(dataIso).getTime();
  const minutos = Math.floor(diffMs / 60000);

  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}
