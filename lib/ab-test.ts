'use client';

import { useEffect, useState } from 'react';
import { registrarEvento } from './analytics';
import { randomFloat } from './random';

// Hook genérico de teste A/B — pronto pra usar, mas sem nenhum
// experimento específico rodando ainda (ninguém definiu o que testar).
// Uso: const variante = useTesteAB('cor_botao_comprar', ['a', 'b']);
//
// Como funciona: a pessoa é sorteada pra uma variante na primeira visita
// e continua vendo a mesma dali pra frente (persistido no aparelho, sem
// precisar de login nem backend). O evento "teste_ab_visto" é disparado
// pro Google Analytics com o nome do experimento e a variante sorteada —
// depois é só comparar as métricas (CTR, favoritar, etc.) segmentando por
// esse parâmetro no próprio painel do GA, sem precisar construir nada
// customizado.
export function useTesteAB<T extends string>(nomeExperimento: string, variantes: readonly T[]): T {
  const [variante, setVariante] = useState<T>(variantes[0]);

  useEffect(() => {
    const chave = `drop-secreto:teste-ab:${nomeExperimento}`;
    let escolhida: T;
    try {
      const salva = window.localStorage.getItem(chave) as T | null;
      if (salva && variantes.includes(salva)) {
        escolhida = salva;
      } else {
        escolhida = variantes[Math.floor(randomFloat() * variantes.length)];
        window.localStorage.setItem(chave, escolhida);
      }
    } catch {
      escolhida = variantes[Math.floor(randomFloat() * variantes.length)];
    }
    setVariante(escolhida);
    registrarEvento('teste_ab_visto', { experimento: nomeExperimento, variante: escolhida });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeExperimento]);

  return variante;
}
