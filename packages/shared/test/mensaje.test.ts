import { describe, expect, it } from 'vitest';
import { generarMensajePedido, type DatosMensajePedido } from '../src';

const base: DatosMensajePedido = {
  comercio: 'Pizzería Don Luis',
  cliente: 'Juan Pérez',
  tipoEntrega: 'ENVIO',
  direccion: 'Av. Hipólito Yrigoyen 1234, Lomas de Zamora',
  zona: 'Centro',
  costoEnvio: 2000,
  items: [
    {
      productoId: 1,
      varianteId: 10,
      nombre: 'Muzzarella',
      variante: 'Grande',
      precioUnitario: 12000,
      cantidad: 2,
    },
    {
      productoId: 2,
      varianteId: 20,
      nombre: 'Empanadas de carne',
      variante: 'Docena',
      precioUnitario: 15000,
      cantidad: 1,
    },
  ],
  formaPago: 'EFECTIVO',
  abonaCon: 50000,
  observaciones: 'Tocar timbre 2B',
};

describe('generarMensajePedido', () => {
  it('genera el mensaje completo de un pedido con envío', () => {
    expect(generarMensajePedido(base)).toBe(
      [
        '*Nuevo pedido - Pizzería Don Luis*',
        '',
        '*Cliente:* Juan Pérez',
        '*Entrega:* Envío a domicilio (Centro)',
        '*Dirección:* Av. Hipólito Yrigoyen 1234, Lomas de Zamora',
        '',
        '*Pedido:*',
        '• 2x Muzzarella (Grande) — $24.000',
        '• 1x Empanadas de carne (Docena) — $15.000',
        '',
        'Subtotal: $39.000',
        'Envío: $2.000',
        '*Total: $41.000*',
        '',
        '*Pago:* Efectivo (abona con $50.000)',
        '*Observaciones:* Tocar timbre 2B',
      ].join('\n'),
    );
  });

  it('con retiro en local no muestra dirección, subtotal ni envío', () => {
    const msg = generarMensajePedido({ ...base, tipoEntrega: 'RETIRO', direccion: undefined });
    expect(msg).toContain('*Entrega:* Retiro en el local');
    expect(msg).not.toContain('Dirección');
    expect(msg).not.toContain('Envío:');
    expect(msg).toContain('*Total: $39.000*');
  });

  it('no muestra "abona con" si el monto no supera el total o si paga por transferencia', () => {
    expect(generarMensajePedido({ ...base, abonaCon: 41000 })).toContain('*Pago:* Efectivo\n');
    const transf = generarMensajePedido({
      ...base,
      formaPago: 'TRANSFERENCIA',
      abonaCon: undefined,
    });
    expect(transf).toContain('*Pago:* Transferencia');
  });

  it('omite observaciones vacías', () => {
    const msg = generarMensajePedido({ ...base, observaciones: '   ' });
    expect(msg).not.toContain('Observaciones');
  });

  it('incluye la nota por ítem en cursiva', () => {
    const msg = generarMensajePedido({
      ...base,
      items: [{ ...base.items[0]!, nota: 'sin aceitunas' }],
    });
    expect(msg).toContain('• 2x Muzzarella (Grande) — $24.000\n   _sin aceitunas_');
  });

  it('limpia caracteres de formato de WhatsApp que escribe el cliente', () => {
    const msg = generarMensajePedido({
      ...base,
      cliente: '*Juan* _Pérez_',
      observaciones: '~hola~',
    });
    expect(msg).toContain('*Cliente:* Juan Pérez');
    expect(msg).toContain('*Observaciones:* hola');
  });

  it('falla si no hay productos', () => {
    expect(() => generarMensajePedido({ ...base, items: [] })).toThrow(/sin productos/);
  });

  it('falla si es envío y no hay dirección', () => {
    expect(() => generarMensajePedido({ ...base, direccion: '  ' })).toThrow(/dirección/);
  });
});
