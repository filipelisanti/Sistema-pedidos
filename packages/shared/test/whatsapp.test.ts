import { describe, expect, it } from 'vitest';
import { construirLinkWhatsapp, esNumeroWhatsappValido, normalizarNumeroWhatsapp } from '../src';

describe('normalizarNumeroWhatsapp', () => {
  it.each([
    ['5491112345678', '5491112345678'],
    ['+54 9 11 1234-5678', '5491112345678'],
    ['+54 9 2944 12-3456', '5492944123456'],
  ])('acepta %s', (entrada, esperado) => {
    expect(normalizarNumeroWhatsapp(entrada)).toBe(esperado);
  });

  it.each([
    ['011 15 1234-5678', 'formato local con 0 y 15'],
    ['541112345678', 'falta el 9 de celular'],
    ['549111234567', 'le falta un dígito'],
    ['', 'vacío'],
  ])('rechaza %s (%s)', (entrada) => {
    expect(normalizarNumeroWhatsapp(entrada)).toBeNull();
    expect(esNumeroWhatsappValido(entrada)).toBe(false);
  });
});

describe('construirLinkWhatsapp', () => {
  it('arma el link de wa.me con el texto codificado', () => {
    const link = construirLinkWhatsapp('+54 9 11 1234-5678', 'Hola *Don Luis*');
    expect(link).toBe('https://wa.me/5491112345678?text=Hola%20*Don%20Luis*');
  });

  it('codifica tildes, ñ, &, # y saltos de línea, y se puede decodificar sin pérdida', () => {
    const mensaje = 'Ñoquis & café #1\nDirección: Peña 123';
    const link = construirLinkWhatsapp('5491112345678', mensaje);
    const texto = new URL(link).searchParams.get('text');
    const query = link.split('?text=')[1] ?? '';
    // Ni espacios ni saltos de línea crudos, y & y # codificados (si no, cortarían el texto)
    expect(query).not.toMatch(/[\s&#]/);
    expect(texto).toBe(mensaje);
  });

  it('lanza error con un número inválido', () => {
    expect(() => construirLinkWhatsapp('1234', 'hola')).toThrow(/inválido/);
  });
});
