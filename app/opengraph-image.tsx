import { ImageResponse } from 'next/og';

// Imagem que aparece quando alguém compartilha um link do site (WhatsApp,
// Instagram, Facebook, Twitter/X, Telegram). Gerada em código — sem precisar
// de nenhum arquivo de imagem pronto — pra sempre bater com as cores da
// marca. Só serve como PADRÃO: a página de produto (app/produto/[id]) já
// define a própria imagem (a foto real do produto), que tem prioridade
// sobre essa aqui nas páginas de produto.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Drop Secreto — Radar Inteligente de Ofertas';

const COR_FUNDO = '#0A0A0B';
const COR_ACCENT = '#00E676';
const COR_TEXTO_PRIMARIO = '#F5F5F7';
const COR_TEXTO_SECUNDARIO = '#9A9AA2';
const COR_LINHA = 'rgba(255,255,255,0.08)';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COR_FUNDO,
          position: 'relative',
        }}
      >
        {/* brilho suave atrás do logo, mesmo verde de destaque do site */}
        <div
          style={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: 420,
            backgroundColor: 'rgba(0, 230, 118, 0.16)',
            filter: 'blur(10px)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 64,
              backgroundColor: COR_ACCENT,
              boxShadow: '0 0 60px rgba(0, 230, 118, 0.45)',
            }}
          />
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ color: COR_TEXTO_PRIMARIO }}>Drop</span>
            <span style={{ color: COR_ACCENT, marginLeft: 20 }}>Secreto</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 34,
            fontWeight: 500,
            color: COR_TEXTO_SECUNDARIO,
            textAlign: 'center',
            maxWidth: 860,
          }}
        >
          A internet promete desconto. A gente confirma.
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 44 }}>
          {['Drop Score', 'Preço real', 'Loja confiável'].map((texto) => (
            <div
              key={texto}
              style={{
                display: 'flex',
                padding: '10px 24px',
                borderRadius: 999,
                border: `1px solid ${COR_LINHA}`,
                color: COR_TEXTO_SECUNDARIO,
                fontSize: 24,
              }}
            >
              {texto}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
