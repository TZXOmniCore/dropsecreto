import { describe, it, expect } from 'vitest';
import { calcularDropScore, type EntradaDropScore } from '../drop-score-engine';

// Entrada "base" válida — cada teste só sobrescreve o que importa pro
// caso, pra ficar claro o que está sendo testado de verdade.
function entradaBase(overrides: Partial<EntradaDropScore> = {}): EntradaDropScore {
  return {
    precoAtual: 100,
    precoAntigo: 200,
    freteGratis: false,
    valorFrete: null,
    avaliacao: 4.5,
    quantidadeAvaliacoes: 0,
    quantidadeVendida: 50,
    temCupomAtivo: false,
    lojaOficial: false,
    lojaConfiabilidade: 50,
    lojaAvaliacaoMedia: 4.5,
    lojaSuspeita: false,
    historicoPrecos: [{ preco: 200, data: '2026-06-01' }],
    ...overrides,
  };
}

describe('calcularDropScore — regras de corte', () => {
  it('rejeita loja marcada como suspeita', () => {
    const resultado = calcularDropScore(entradaBase({ lojaSuspeita: true }));
    expect(resultado.status).toBe('rejeitado');
  });

  it('rejeita loja com nota abaixo de 3,5', () => {
    const resultado = calcularDropScore(entradaBase({ lojaAvaliacaoMedia: 3.2 }));
    expect(resultado.status).toBe('rejeitado');
    expect(resultado.motivoRejeicao).toContain('Loja');
  });

  it('rejeita produto com nota própria abaixo de 3,5', () => {
    const resultado = calcularDropScore(entradaBase({ avaliacao: 3.0 }));
    expect(resultado.status).toBe('rejeitado');
    expect(resultado.motivoRejeicao).toContain('Produto');
  });

  it('produto sem avaliação própria (avaliacao=0) exige loja com nota >= 4,0', () => {
    const rejeitado = calcularDropScore(entradaBase({ avaliacao: 0, lojaAvaliacaoMedia: 3.8 }));
    expect(rejeitado.status).toBe('rejeitado');

    const aprovado = calcularDropScore(entradaBase({ avaliacao: 0, lojaAvaliacaoMedia: 4.2 }));
    expect(aprovado.status).toBe('aprovado');
  });
});

describe('calcularDropScore — histórico de preço (o coração do Drop Score)', () => {
  it('marca promoção como verificada quando o preço "de" bate com o histórico', () => {
    const resultado = calcularDropScore(
      entradaBase({ precoAntigo: 200, historicoPrecos: [{ preco: 200, data: '2026-06-01' }] })
    );
    expect(resultado.promocaoVerificada).toBe(true);
  });

  it('NÃO penaliza produto novo sem histórico acumulado ainda (catálogo recém populado)', () => {
    const semHistorico = calcularDropScore(entradaBase({ precoAntigo: 200, historicoPrecos: [] }));
    const comHistoricoQueBate = calcularDropScore(
      entradaBase({ precoAntigo: 200, historicoPrecos: [{ preco: 200, data: '2026-06-01' }] })
    );
    // Produto novo não deve ficar pior que "sem desconto nenhum" — mas
    // fica abaixo de uma promoção já confirmada no histórico.
    expect(semHistorico.dropScore).toBeLessThan(comHistoricoQueBate.dropScore);
    expect(semHistorico.status).toBe('aprovado');
  });

  it('penaliza preço "de" que existe mas não bate com nenhum registro do histórico (sinal de preço inflado)', () => {
    const semHistorico = calcularDropScore(entradaBase({ precoAntigo: 200, historicoPrecos: [] }));
    const historicoQueNaoBate = calcularDropScore(
      entradaBase({ precoAntigo: 999, historicoPrecos: [{ preco: 150, data: '2026-06-01' }] })
    );
    // Esse caso é o mais suspeito de todos — tem que pontuar pior que o
    // produto novo sem histórico nenhum.
    expect(historicoQueNaoBate.dropScore).toBeLessThan(semHistorico.dropScore);
  });
});

describe('calcularDropScore — classificação', () => {
  it('classifica como Excelente quando o score é bem alto', () => {
    const resultado = calcularDropScore(
      entradaBase({
        precoAtual: 50,
        precoAntigo: 200,
        historicoPrecos: [{ preco: 200, data: '2026-06-01' }],
        avaliacao: 5,
        quantidadeVendida: 5000,
        lojaOficial: true,
        lojaConfiabilidade: 100,
      })
    );
    expect(resultado.classificacao).toBe('Excelente');
  });

  it('pesos do motor somam 1 (100%) — senão o dropScore não bate com o % mostrado em /como-funciona', async () => {
    const { PESOS } = await import('../drop-score-engine');
    const soma = Object.values(PESOS).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1, 5);
  });
});
