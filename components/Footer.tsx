export function Footer() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-ink-secondary">
        <p>
          <span className="text-ink-primary">Drop Secreto</span> — cada produto listado passou
          pelo motor de Drop Score antes de aparecer aqui.
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          Como afiliados, podemos receber comissão por compras feitas através dos links deste site.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-secondary">
          <a href="/sobre-nos" className="transition-colors hover:text-ink-primary">
            Sobre nós
          </a>
          <a href="/como-funciona" className="transition-colors hover:text-ink-primary">
            Como funciona
          </a>
          <a href="/privacidade" className="transition-colors hover:text-ink-primary">
            Privacidade e termos
          </a>
        </div>

        <p className="mt-6 text-xs text-ink-faint">
          © {anoAtual} Drop Secreto. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
