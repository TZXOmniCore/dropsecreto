import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UUID_REGEX, sanitizarLinkAfiliado, criarLimitador } from '../link-redirect';

describe('UUID_REGEX', () => {
  it('aceita um UUID v4 válido em minúsculas', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('aceita um UUID válido em maiúsculas', () => {
    expect(UUID_REGEX.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejeita texto que não é UUID', () => {
    expect(UUID_REGEX.test('não-e-um-uuid')).toBe(false);
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716')).toBe(false);
    expect(UUID_REGEX.test('')).toBe(false);
  });

  it('rejeita tentativa de injeção via id manipulado na URL', () => {
    expect(UUID_REGEX.test("550e8400-e29b-41d4-a716-446655440000; DROP TABLE produtos;")).toBe(false);
  });
});

describe('sanitizarLinkAfiliado', () => {
  it('aceita uma URL https normal', () => {
    expect(sanitizarLinkAfiliado('https://shopee.com.br/produto-123')).toBe(
      'https://shopee.com.br/produto-123'
    );
  });

  it('remove espaços nas pontas', () => {
    expect(sanitizarLinkAfiliado('  https://shopee.com.br/produto-123  ')).toBe(
      'https://shopee.com.br/produto-123'
    );
  });

  it('remove quebra de linha e outros caracteres de controle (proteção contra header/response splitting)', () => {
    const bruto = 'https://shopee.com.br/produto\r\nSet-Cookie: sessao=roubada';
    const resultado = sanitizarLinkAfiliado(bruto);
    expect(resultado).not.toBeNull();
    expect(resultado).not.toContain('\r');
    expect(resultado).not.toContain('\n');
  });

  it('rejeita protocolo que não é http/https', () => {
    expect(sanitizarLinkAfiliado('javascript:alert(1)')).toBeNull();
    expect(sanitizarLinkAfiliado('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('rejeita string vazia ou só espaço', () => {
    expect(sanitizarLinkAfiliado('')).toBeNull();
    expect(sanitizarLinkAfiliado('   ')).toBeNull();
  });

  it('rejeita URL malformada', () => {
    expect(sanitizarLinkAfiliado('não é uma url')).toBeNull();
  });
});

describe('criarLimitador', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('libera requisições até o limite da janela', () => {
    const excedeuLimite = criarLimitador({ janelaMs: 60_000, limitePorJanela: 3 });
    expect(excedeuLimite('1.2.3.4')).toBe(false);
    expect(excedeuLimite('1.2.3.4')).toBe(false);
    expect(excedeuLimite('1.2.3.4')).toBe(false);
  });

  it('bloqueia a partir da requisição que excede o limite', () => {
    const excedeuLimite = criarLimitador({ janelaMs: 60_000, limitePorJanela: 3 });
    excedeuLimite('1.2.3.4');
    excedeuLimite('1.2.3.4');
    excedeuLimite('1.2.3.4');
    expect(excedeuLimite('1.2.3.4')).toBe(true);
  });

  it('trata cada chave (IP) de forma independente', () => {
    const excedeuLimite = criarLimitador({ janelaMs: 60_000, limitePorJanela: 1 });
    expect(excedeuLimite('1.1.1.1')).toBe(false);
    expect(excedeuLimite('2.2.2.2')).toBe(false);
    expect(excedeuLimite('1.1.1.1')).toBe(true);
    expect(excedeuLimite('2.2.2.2')).toBe(true);
  });

  it('libera de novo depois que a janela expira', () => {
    const excedeuLimite = criarLimitador({ janelaMs: 60_000, limitePorJanela: 1 });
    expect(excedeuLimite('1.2.3.4')).toBe(false);
    expect(excedeuLimite('1.2.3.4')).toBe(true);

    vi.advanceTimersByTime(60_001);

    expect(excedeuLimite('1.2.3.4')).toBe(false);
  });
});
