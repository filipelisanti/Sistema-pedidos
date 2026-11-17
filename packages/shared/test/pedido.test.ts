import { describe, expect, it } from 'vitest';
import {
  armarPedido,
  faltanteParaMinimo,
  menuComercioSchema,
  sincronizarCarrito,
  type ItemCarrito,
  type MenuComercio,
} from '../src';

const menu: MenuComercio = {
  id: 1,
  nombre: 'Pizzería Test',
  slug: 'pizzeria-test',
  rubro: 'Pizzería',
  localidad: 'Lomas de Zamora',
  logoUrl: null,
  aceptaEnvio: true,
  aceptaRetiro: true,
  horarios: [{ diaSemana: 1, abre: '19:00', cierra: '23:00' }],
  whatsapp: '5491112345678',
  direccion: 'Calle 123',
  pedidoMinimo: 10000,
  zonasEnvio: [{ id: 7, nombre: 'Centro', costo: 1500 }],
  categorias: [
    {
      id: 1,
      nombre: 'Pizzas',
      productos: [
        {
          id: 10,
          nombre: 'Muzzarella',
          descripcion: null,
          precio: 12000,
          imagenUrl: null,
          disponible: true,
          variantes: [
            { id: 100, nombre: 'Grande', precio: 12000 },
            { id: 101, nombre: 'Chica', precio: 9000 },
          ],
        },
        {
          id: 11,
          nombre: 'Fugazzeta',
          descripcion: null,
          precio: 16000,
          imagenUrl: null,
          disponible: true,
          variantes: [],
        },
        {
          id: 12,
          nombre: 'Humita',
          descripcion: null,
          precio: 1400,
          imagenUrl: null,
          disponible: false,
          variantes: [],
        },
      ],
    },
  ],
};

const item = (over: Partial<ItemCarrito>): ItemCarrito => ({
  productoId: 11,
  varianteId: null,
  nombre: 'Fugazzeta',
  variante: null,
  precioUnitario: 16000,
  cantidad: 1,
  ...over,
});

describe('menuComercioSchema', () => {
  it('acepta un menú válido', () => {
    expect(menuComercioSchema.safeParse(menu).success).toBe(true);
  });

  it('rechaza un whatsapp sin normalizar', () => {
    expect(menuComercioSchema.safeParse({ ...menu, whatsapp: '1112345678' }).success).toBe(false);
  });
});

describe('faltanteParaMinimo', () => {
  it('devuelve lo que falta, o 0 si ya llega', () => {
    expect(faltanteParaMinimo(7000, 10000)).toBe(3000);
    expect(faltanteParaMinimo(10000, 10000)).toBe(0);
    expect(faltanteParaMinimo(5000, 0)).toBe(0);
  });
});

describe('sincronizarCarrito', () => {
  it('actualiza el precio al vigente', () => {
    const r = sincronizarCarrito([item({ precioUnitario: 10000 })], menu);
    expect(r[0]?.precioUnitario).toBe(16000);
  });

  it('actualiza el precio de la variante', () => {
    const r = sincronizarCarrito(
      [item({ productoId: 10, varianteId: 101, variante: 'Chica', precioUnitario: 1 })],
      menu,
    );
    expect(r[0]).toMatchObject({ variante: 'Chica', precioUnitario: 9000 });
  });

  it('descarta productos inexistentes, sin stock o variantes que ya no existen', () => {
    const r = sincronizarCarrito(
      [
        item({ productoId: 999 }),
        item({ productoId: 12 }),
        item({ productoId: 10, varianteId: 555 }),
        item({ productoId: 10, varianteId: null }),
        item({ productoId: 11, varianteId: 100 }),
      ],
      menu,
    );
    expect(r).toEqual([]);
  });

  it('conserva cantidad y nota', () => {
    const r = sincronizarCarrito([item({ cantidad: 3, nota: 'bien cocida' })], menu);
    expect(r[0]).toMatchObject({ cantidad: 3, nota: 'bien cocida' });
  });
});

describe('armarPedido', () => {
  const items = [item({})];

  it('arma un pedido con envío con la zona y su costo', () => {
    const r = armarPedido(menu, items, {
      nombre: 'Ana',
      tipoEntrega: 'ENVIO',
      direccion: 'Mitre 123',
      zonaEnvioId: 7,
      formaPago: 'EFECTIVO',
      abonaCon: 20000,
    });
    expect(r).toMatchObject({
      ok: true,
      total: 17500,
      datos: { zona: 'Centro', costoEnvio: 1500, direccion: 'Mitre 123', abonaCon: 20000 },
    });
  });

  it('en retiro no incluye dirección ni envío', () => {
    const r = armarPedido(menu, items, {
      nombre: 'Ana',
      tipoEntrega: 'RETIRO',
      direccion: 'quedó escrita',
      formaPago: 'TRANSFERENCIA',
    });
    expect(r.ok && r.total).toBe(16000);
    expect(r.ok && r.datos.direccion).toBeUndefined();
  });

  it('rechaza carrito vacío', () => {
    const r = armarPedido(menu, [], {
      nombre: 'Ana',
      tipoEntrega: 'RETIRO',
      formaPago: 'EFECTIVO',
    });
    expect(r.ok).toBe(false);
  });

  it('rechaza si no llega al mínimo (el envío no cuenta)', () => {
    const r = armarPedido(menu, [item({ precioUnitario: 9000 })], {
      nombre: 'Ana',
      tipoEntrega: 'ENVIO',
      direccion: 'Mitre 123',
      zonaEnvioId: 7,
      formaPago: 'EFECTIVO',
    });
    expect(r).toEqual({ ok: false, error: 'No llegás al pedido mínimo' });
  });

  it('rechaza una zona que no es del comercio', () => {
    const r = armarPedido(menu, items, {
      nombre: 'Ana',
      tipoEntrega: 'ENVIO',
      direccion: 'Mitre 123',
      zonaEnvioId: 99,
      formaPago: 'EFECTIVO',
    });
    expect(r.ok).toBe(false);
  });

  it('rechaza un tipo de entrega que el comercio no acepta', () => {
    const r = armarPedido({ ...menu, aceptaEnvio: false }, items, {
      nombre: 'Ana',
      tipoEntrega: 'ENVIO',
      direccion: 'Mitre 123',
      zonaEnvioId: 7,
      formaPago: 'EFECTIVO',
    });
    expect(r).toEqual({ ok: false, error: 'Este comercio no hace envíos' });
  });
});
