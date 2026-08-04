// Consentimento de cookies (LGPD) — usado pelo CookieBanner, pelo Analytics
// (que só carrega GA/Clarity depois do "aceito") e pelo link "Cookies" do
// rodapé (que reabre o banner pra trocar a escolha depois).
//
// Guardado em localStorage (mesmo mecanismo já usado pra favoritos/preferências
// — só no aparelho da pessoa, nunca sai daqui) e propagado pros outros
// componentes na mesma aba via CustomEvent, sem precisar de Context/Provider
// nem de recarregar a página quando o usuário aceita ou recusa.

export type ConsentimentoCookies = 'aceito' | 'recusado';

const CHAVE_STORAGE = 'ds_cookies_consentimento';
const EVENTO_MUDANCA = 'ds-consentimento-cookies-mudou';
const EVENTO_REABRIR = 'ds-reabrir-banner-cookies';

export function lerConsentimento(): ConsentimentoCookies | null {
  if (typeof window === 'undefined') return null;
  const valor = window.localStorage.getItem(CHAVE_STORAGE);
  return valor === 'aceito' || valor === 'recusado' ? valor : null;
}

export function salvarConsentimento(valor: ConsentimentoCookies): void {
  window.localStorage.setItem(CHAVE_STORAGE, valor);
  window.dispatchEvent(new CustomEvent<ConsentimentoCookies>(EVENTO_MUDANCA, { detail: valor }));
}

// Chamado pelo Analytics — recebe a escolha atual assim que ela mudar
// (aceite ou recusa vindos do banner), sem precisar de reload.
export function aoMudarConsentimento(callback: (valor: ConsentimentoCookies) => void): () => void {
  function handler(evento: Event) {
    callback((evento as CustomEvent<ConsentimentoCookies>).detail);
  }
  window.addEventListener(EVENTO_MUDANCA, handler);
  return () => window.removeEventListener(EVENTO_MUDANCA, handler);
}

// Usado pelo link "Cookies" do rodapé pra reabrir o banner e permitir
// trocar a escolha já feita.
export function reabrirBannerCookies(): void {
  window.dispatchEvent(new Event(EVENTO_REABRIR));
}

export function aoReabrirBanner(callback: () => void): () => void {
  window.addEventListener(EVENTO_REABRIR, callback);
  return () => window.removeEventListener(EVENTO_REABRIR, callback);
}
