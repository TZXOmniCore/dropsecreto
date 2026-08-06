import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ============================================================
// Por que este teste existe:
//
// O motor de Drop Score vive em DOIS lugares (ver comentário no topo de
// drop-score-engine.ts e de calcular-drop-score/index.ts): o arquivo
// compartilhado aqui, e uma cópia colada dentro da Edge Function
// calcular-drop-score/index.ts — necessária porque o deploy manual pela
// Dashboard do Supabase não empacota a pasta `_shared/`.
//
// Isso já causou uma dessincronização real (limiares diferentes: 3,5 aqui
// vs. 4,0 lá). Não dá pra eliminar a duplicação sem migrar o deploy pra
// Supabase CLI, e não tem como importar calcular-drop-score/index.ts
// direto num teste Node (o arquivo usa `Deno.env.get(...)` no topo do
// módulo, que não existe fora do runtime Deno).
//
// Solução: comparar os PESOS e os limiares como TEXTO entre os dois
// arquivos. Se alguém mudar um peso/limiar num arquivo e esquecer do
// outro, esse teste quebra imediatamente — em vez de só descobrirmos
// meses depois, olhando o comportamento de produção.
// ============================================================

const CAMINHO_SHARED = fileURLToPath(new URL('../drop-score-engine.ts', import.meta.url));
const CAMINHO_COPIA = fileURLToPath(new URL('../../calcular-drop-score/index.ts', import.meta.url));

function extrairNumero(nomeConstante: string, texto: string): number {
  const match = texto.match(new RegExp(`\\b${nomeConstante}\\s*=\\s*([\\d.]+)`));
  if (!match) {
    throw new Error(`Não encontrei "${nomeConstante}" no arquivo lido — o formato do arquivo mudou?`);
  }
  return Number(match[1]);
}

function extrairPeso(chave: string, texto: string): number {
  const match = texto.match(new RegExp(`\\b${chave}:\\s*([\\d.]+)`));
  if (!match) {
    throw new Error(`Não encontrei o peso "${chave}" no arquivo lido — o formato do arquivo mudou?`);
  }
  return Number(match[1]);
}

const CHAVES_PESO = ['desconto', 'historicoPreco', 'avaliacao', 'vendas', 'loja', 'frete', 'cupom'] as const;
const CONSTANTES_LIMIAR = [
  'LIMIAR_NOTA_LOJA',
  'LIMIAR_NOTA_PRODUTO',
  'LIMIAR_NOTA_LOJA_PRODUTO_SEM_AVALIACAO',
] as const;

describe('sincronização entre drop-score-engine.ts e a cópia em calcular-drop-score/index.ts', () => {
  const textoShared = readFileSync(CAMINHO_SHARED, 'utf-8');
  const textoCopia = readFileSync(CAMINHO_COPIA, 'utf-8');

  it.each(CHAVES_PESO)('peso "%s" é igual nos dois arquivos', (chave) => {
    expect(extrairPeso(chave, textoCopia)).toBe(extrairPeso(chave, textoShared));
  });

  it.each(CONSTANTES_LIMIAR)('constante "%s" é igual nos dois arquivos', (nome) => {
    expect(extrairNumero(nome, textoCopia)).toBe(extrairNumero(nome, textoShared));
  });

  it('soma dos pesos dá 1 (100%) em cada arquivo', () => {
    for (const texto of [textoShared, textoCopia]) {
      const soma = CHAVES_PESO.reduce((total, chave) => total + extrairPeso(chave, texto), 0);
      expect(soma).toBeCloseTo(1, 5);
    }
  });
});
