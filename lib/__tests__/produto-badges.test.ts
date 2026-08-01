import { describe, it, expect } from 'vitest';
import { produtoENovo, produtoPoucoVendido, textoMenorPreco, DIAS_PRODUTO_NOVO } from '../produto-badges';

function horasAtras(horas: number) {
  return new Date(Date.now() - horas * 60 * 60 * 1000).toISOString();
}

describe('produtoENovo', () => {
  it('considera novo um produto importado hoje', () => {
    expect(produtoENovo({ importadoEm: horasAtras(1) })).toBe(true);
  });

  it('não considera novo um produto importado há mais dias que o limite', () => {
    expect(produtoENovo({ importadoEm: horasAtras((DIAS_PRODUTO_NOVO + 1) * 24) })).toBe(false);
  });
});

describe('produtoPoucoVendido', () => {
  it('marca como pouco vendido abaixo do limite', () => {
    expect(produtoPoucoVendido({ quantidadeVendida: 3 })).toBe(true);
  });

  it('não marca quando já vendeu bastante', () => {
    expect(produtoPoucoVendido({ quantidadeVendida: 500 })).toBe(false);
  });
});

describe('textoMenorPreco', () => {
  it('retorna null quando o histórico é curto demais (produto muito novo)', () => {
    const resultado = textoMenorPreco({
      precoAtual: 50,
      historico90d: [50, 50],
      historicoDiasCobertos: 1,
    });
    expect(resultado).toBeNull();
  });

  it('retorna null quando o preço atual não é o menor do histórico', () => {
    const resultado = textoMenorPreco({
      precoAtual: 80,
      historico90d: [100, 90, 70, 60],
      historicoDiasCobertos: 30,
    });
    expect(resultado).toBeNull();
  });

  it('retorna o texto do badge quando o preço atual é de fato o menor registrado', () => {
    const resultado = textoMenorPreco({
      precoAtual: 59.9,
      historico90d: [100, 90, 70, 59.9],
      historicoDiasCobertos: 47,
    });
    expect(resultado).toBe('menor preço em 47 dias');
  });
});
