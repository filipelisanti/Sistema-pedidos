import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '../src';

describe('checkoutSchema', () => {
  it('acepta un retiro en local sin dirección', () => {
    const r = checkoutSchema.safeParse({
      nombre: 'Ana',
      tipoEntrega: 'RETIRO',
      formaPago: 'EFECTIVO',
    });
    expect(r.success).toBe(true);
  });

  it('exige dirección y zona si es envío', () => {
    const r = checkoutSchema.safeParse({
      nombre: 'Ana',
      tipoEntrega: 'ENVIO',
      formaPago: 'EFECTIVO',
    });
    expect(r.success).toBe(false);
    const paths = r.error?.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['direccion', 'zonaEnvioId']));
  });

  it('rechaza "abona con" si paga por transferencia', () => {
    const r = checkoutSchema.safeParse({
      nombre: 'Ana',
      tipoEntrega: 'RETIRO',
      formaPago: 'TRANSFERENCIA',
      abonaCon: 10000,
    });
    expect(r.success).toBe(false);
  });

  it('recorta espacios y exige un nombre de al menos 2 letras', () => {
    const r = checkoutSchema.safeParse({
      nombre: '  A ',
      tipoEntrega: 'RETIRO',
      formaPago: 'EFECTIVO',
    });
    expect(r.success).toBe(false);
  });
});
