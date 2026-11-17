import type { MenuComercio } from './api';
import { calcularTotales } from './carrito';
import type { DatosMensajePedido } from './mensaje';
import type { Checkout, ItemCarrito } from './schemas';

/** Cuánto le falta al subtotal para llegar al pedido mínimo (0 si ya llega). */
export function faltanteParaMinimo(subtotal: number, pedidoMinimo: number): number {
  return Math.max(0, pedidoMinimo - subtotal);
}

/**
 * Ajusta un carrito guardado (ej. en localStorage) al menú actual:
 *  - descarta productos o variantes que ya no existen o están sin stock
 *  - actualiza nombre, variante y precio a los vigentes
 * Así el cliente nunca envía un precio viejo.
 */
export function sincronizarCarrito(
  items: readonly ItemCarrito[],
  menu: Pick<MenuComercio, 'categorias'>,
): ItemCarrito[] {
  const productos = new Map(menu.categorias.flatMap((c) => c.productos).map((p) => [p.id, p]));

  return items.flatMap<ItemCarrito>((item) => {
    const producto = productos.get(item.productoId);
    if (!producto || !producto.disponible) return [];

    if (producto.variantes.length === 0) {
      if (item.varianteId !== null) return [];
      return [
        { ...item, nombre: producto.nombre, variante: null, precioUnitario: producto.precio },
      ];
    }

    const variante = producto.variantes.find((v) => v.id === item.varianteId);
    if (!variante) return [];
    return [
      {
        ...item,
        nombre: producto.nombre,
        variante: variante.nombre,
        precioUnitario: variante.precio,
      },
    ];
  });
}

export type ResultadoPedido =
  { ok: true; datos: DatosMensajePedido; total: number } | { ok: false; error: string };

/**
 * Une el carrito, los datos del checkout (ya validados con checkoutSchema) y el menú del comercio,
 * y verifica las reglas que dependen del comercio: tipo de entrega aceptado, zona válida y pedido mínimo.
 */
export function armarPedido(
  menu: Pick<
    MenuComercio,
    'nombre' | 'aceptaEnvio' | 'aceptaRetiro' | 'pedidoMinimo' | 'zonasEnvio'
  >,
  items: readonly ItemCarrito[],
  checkout: Checkout,
): ResultadoPedido {
  if (items.length === 0) return { ok: false, error: 'El carrito está vacío' };

  if (checkout.tipoEntrega === 'ENVIO' && !menu.aceptaEnvio) {
    return { ok: false, error: 'Este comercio no hace envíos' };
  }
  if (checkout.tipoEntrega === 'RETIRO' && !menu.aceptaRetiro) {
    return { ok: false, error: 'Este comercio no tiene retiro en el local' };
  }

  let zona: MenuComercio['zonasEnvio'][number] | undefined;
  if (checkout.tipoEntrega === 'ENVIO') {
    zona = menu.zonasEnvio.find((z) => z.id === checkout.zonaEnvioId);
    if (!zona) return { ok: false, error: 'Elegí una zona de envío válida' };
  }

  const { subtotal, total } = calcularTotales(items, checkout.tipoEntrega, zona?.costo ?? 0);
  if (faltanteParaMinimo(subtotal, menu.pedidoMinimo) > 0) {
    return { ok: false, error: 'No llegás al pedido mínimo' };
  }

  return {
    ok: true,
    total,
    datos: {
      comercio: menu.nombre,
      cliente: checkout.nombre,
      tipoEntrega: checkout.tipoEntrega,
      direccion: checkout.tipoEntrega === 'ENVIO' ? checkout.direccion : undefined,
      zona: zona?.nombre,
      costoEnvio: zona?.costo,
      items,
      formaPago: checkout.formaPago,
      abonaCon: checkout.formaPago === 'EFECTIVO' ? checkout.abonaCon : undefined,
      observaciones: checkout.observaciones,
    },
  };
}
