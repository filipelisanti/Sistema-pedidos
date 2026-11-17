import type { ItemCarrito, TipoEntrega } from './schemas';

/**
 * Funciones puras para manejar el carrito.
 * No mutan el array recibido: siempre devuelven uno nuevo (útil para React/Zustand).
 */

const mismaClave = (a: Pick<ItemCarrito, 'productoId' | 'varianteId'>, b: typeof a) =>
  a.productoId === b.productoId && a.varianteId === b.varianteId;

export const CANTIDAD_MAXIMA = 99;

/** Agrega un ítem; si ya existe la misma combinación producto+variante, suma la cantidad. */
export function agregarItem(items: readonly ItemCarrito[], nuevo: ItemCarrito): ItemCarrito[] {
  const existente = items.find((i) => mismaClave(i, nuevo));
  if (!existente) return [...items, { ...nuevo }];
  return items.map((i) =>
    mismaClave(i, nuevo)
      ? { ...i, cantidad: Math.min(i.cantidad + nuevo.cantidad, CANTIDAD_MAXIMA) }
      : i,
  );
}

/** Cambia la cantidad. Si la cantidad es <= 0, el ítem se elimina. */
export function cambiarCantidad(
  items: readonly ItemCarrito[],
  clave: Pick<ItemCarrito, 'productoId' | 'varianteId'>,
  cantidad: number,
): ItemCarrito[] {
  if (cantidad <= 0) return quitarItem(items, clave);
  return items.map((i) =>
    mismaClave(i, clave) ? { ...i, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) } : i,
  );
}

export function quitarItem(
  items: readonly ItemCarrito[],
  clave: Pick<ItemCarrito, 'productoId' | 'varianteId'>,
): ItemCarrito[] {
  return items.filter((i) => !mismaClave(i, clave));
}

export function subtotalItem(item: ItemCarrito): number {
  return item.precioUnitario * item.cantidad;
}

export function cantidadTotal(items: readonly ItemCarrito[]): number {
  return items.reduce((acc, i) => acc + i.cantidad, 0);
}

export interface Totales {
  subtotal: number;
  envio: number;
  total: number;
}

/** Calcula subtotal, envío y total. Con retiro en local el envío siempre es 0. */
export function calcularTotales(
  items: readonly ItemCarrito[],
  tipoEntrega: TipoEntrega,
  costoEnvio = 0,
): Totales {
  const subtotal = items.reduce((acc, i) => acc + subtotalItem(i), 0);
  const envio = tipoEntrega === 'ENVIO' ? costoEnvio : 0;
  return { subtotal, envio, total: subtotal + envio };
}
