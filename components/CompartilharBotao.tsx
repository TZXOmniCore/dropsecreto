'use client';

import { Share2 } from 'lucide-react';
import { eventos } from '@/lib/analytics';

interface Props {
  produtoId?: string;
  nomeProduto: string;
  precoFormatado: string;
  url: string;
}

// Usa a Web Share API nativa (funciona em quase todo navegador de
// celular e já abre o menu com WhatsApp/Telegram/etc. junto). Sem
// suporte (a maioria dos navegadores de desktop), cai direto num link
// do WhatsApp com a mensagem pronta — sem precisar de nenhuma
// biblioteca nova.
export function CompartilharBotao({ produtoId, nomeProduto, precoFormatado, url }: Props) {
  async function compartilhar(e: React.MouseEvent) {
    e.preventDefault();
    if (produtoId) eventos.compartilhar(produtoId);
    const texto = `Achei isso no Drop Secreto: ${nomeProduto} por ${precoFormatado}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: nomeProduto, text: texto, url });
        return;
      } catch {
        // pessoa cancelou o menu de compartilhar — não faz nada
        return;
      }
    }

    const linkWhatsApp = `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`;
    window.open(linkWhatsApp, '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      aria-label="Compartilhar essa oferta"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink-secondary transition-colors hover:border-accent/50 hover:text-ink-primary"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
