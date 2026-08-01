import Script from 'next/script';

// Só carrega cada ferramenta se a variável de ambiente correspondente
// estiver configurada — o site funciona 100% normal sem nenhuma delas.
//
// Pra ativar o Google Analytics (audiência, CTR, conversão — itens 1/3/4
// da lista): criar uma conta grátis em analytics.google.com, criar uma
// propriedade GA4, copiar o "ID de medição" (formato G-XXXXXXXXXX) e
// colar em NEXT_PUBLIC_GA_ID.
//
// Pra ativar o Microsoft Clarity (mapa de calor + gravação de sessão —
// item 2): criar conta grátis em clarity.microsoft.com, criar um
// projeto, copiar o "Project ID" e colar em NEXT_PUBLIC_CLARITY_ID.
// Clarity é 100% gratuito, sem limite de sessões nem plano pago.
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}
    </>
  );
}
