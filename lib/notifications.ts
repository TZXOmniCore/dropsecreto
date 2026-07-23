const CHAVE_ALERTAS = 'drop-secreto:alertas';

export interface AlertaLocal {
  id: string;
  termo: string;
  precoAlvo: number;
  criadoEm: string;
}

export function obterAlertas(): AlertaLocal[] {
  if (typeof window === 'undefined') return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE_ALERTAS);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

export function salvarAlerta(alerta: Omit<AlertaLocal, 'id' | 'criadoEm'>): AlertaLocal[] {
  const atuais = obterAlertas();
  const novo: AlertaLocal = {
    ...alerta,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
  };
  const atualizados = [...atuais, novo];
  window.localStorage.setItem(CHAVE_ALERTAS, JSON.stringify(atualizados));
  return atualizados;
}

export function removerAlerta(id: string): AlertaLocal[] {
  const atualizados = obterAlertas().filter((a) => a.id !== id);
  window.localStorage.setItem(CHAVE_ALERTAS, JSON.stringify(atualizados));
  return atualizados;
}

export async function pedirPermissaoNotificacao(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}
