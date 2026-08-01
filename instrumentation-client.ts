import * as Sentry from '@sentry/nextjs';

// Só inicializa se NEXT_PUBLIC_SENTRY_DSN estiver configurado — sem essa
// variável, o site funciona normalmente, só sem monitoramento de erro.
// Pra ativar: criar um projeto grátis em sentry.io (plano Free cobre até
// 5 mil erros/mês) e colar o DSN do projeto na variável de ambiente.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    // Sem sessão gravada (replay) de propósito — evita capturar tela de
    // usuário sem necessidade, mantém alinhado com a política de
    // privacidade (dado agregado, não identificável).
    debug: false,
  });
}
