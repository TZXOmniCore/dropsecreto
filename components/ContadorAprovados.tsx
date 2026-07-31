import { Radar } from 'lucide-react';
import { contarAprovadosRecentes } from '@/lib/produtos';

// Diferente do antigo TrustBar (número fixo, inventado, nunca chegou a
// ser usado em nenhuma página): esse aqui é uma contagem de verdade,
// puxada do banco a cada carregamento — só aparece se houver pelo menos
// 1 produto novo nas últimas horas, pra nunca soar forçado.
export async function ContadorAprovados({ horas = 2 }: { horas?: number }) {
  const total = await contarAprovadosRecentes(horas);
  if (total === 0) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-faint">
      <Radar className="h-3.5 w-3.5 text-accent" />
      {total} {total === 1 ? 'oferta aprovada' : 'ofertas aprovadas'} nas últimas {horas}h
    </p>
  );
}
