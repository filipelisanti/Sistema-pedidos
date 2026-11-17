import { describe, expect, it } from 'vitest';
import {
  agregarItem,
  calcularTotales,
  cambiarCantidad,
  cantidadTotal,
  CANTIDAD_MAXIMA,
  quitarItem,
  type ItemCarrito,
} from '../src';

const muzza: ItemCarrito = {
  productoId: 1,
  varianteId: 10,
  nombre: 'Muzzarella',
  variante: 'Grande',
  precioUnitario: 12000,
  cantidad: 1,
};
const muzzaChica: ItemCarrito = {
  ...muzza,
  varianteId: 11,
  variante: 'Chica',
  precioUnitario: 9000,
};
const empanadas: ItemCarrito = {
  productoId: 2,
  varianteId: null,
  nombre: 'Empanada de carne',
  variante: null,
  precioUnitario: 1500,
  cantidad: 6,
};

describe('carrito', () => {
  it('agrega un ítem nuevo sin mutar el array original', () => {
    const original: ItemCarrito[] = [];
    const resultado = agregarItem(original, muzza);
    expect(resultado).toHaveLength(1);
    expect(original).toHaveLength(0);
  });

  it('suma cantidades si es el mismo producto y variante', () => {
    const items = agregarItem(agregarItem([], muzza), { ...muzza, cantidad: 2 });
    expect(items).toHaveLength(1);
    expect(items[0]?.cantidad).toBe(3);
  });

  it('trata variantes distintas del mismo producto como renglones distintos', () => {
    const items = agregarItem(agregarItem([], muzza), muzzaChica);
    expect(items).toHaveLength(2);
  });

  it('no supera la cantidad máxima', () => {
    const items = agregarItem([{ ...muzza, cantidad: 98 }], { ...muzza, cantidad: 5 });
    expect(items[0]?.cantidad).toBe(CANTIDAD_MAXIMA);
  });

  it('cambiar cantidad a 0 elimina el ítem', () => {
    const items = cambiarCantidad([muzza, empanadas], { productoId: 1, varianteId: 10 }, 0);
    expect(items).toEqual([empanadas]);
  });

  it('quitarItem elimina solo la combinación indicada', () => {
    const items = quitarItem([muzza, muzzaChica], { productoId: 1, varianteId: 11 });
    expect(items).toEqual([muzza]);
  });

  it('cuenta la cantidad total de unidades', () => {
    expect(cantidadTotal([muzza, empanadas])).toBe(7);
  });
});

describe('calcularTotales', () => {
  const items = [{ ...muzza, cantidad: 2 }, empanadas]; // 24000 + 9000

  it('con envío suma el costo de envío', () => {
    expect(calcularTotales(items, 'ENVIO', 2000)).toEqual({
      subtotal: 33000,
      envio: 2000,
      total: 35000,
    });
  });

  it('con retiro en local NO suma envío aunque se pase un costo', () => {
    expect(calcularTotales(items, 'RETIRO', 2000)).toEqual({
      subtotal: 33000,
      envio: 0,
      total: 33000,
    });
  });

  it('carrito vacío da todo en 0', () => {
    expect(calcularTotales([], 'RETIRO')).toEqual({ subtotal: 0, envio: 0, total: 0 });
  });
});
