'use client';

import { reabrirBannerCookies } from '@/lib/cookie-consent';

// Fica no rodapé ao lado dos outros links. Não leva pra nenhuma página —
// só reabre o mesmo popup de consentimento, pra pessoa poder mudar de
// ideia depois de já ter aceitado ou recusado.
export function BotaoCookies() {
  return (
    <button
      type="button"
      onClick={reabrirBannerCookies}
      className="transition-colors hover:text-ink-primary"
    >
      Cookies
    </button>
  );
}
