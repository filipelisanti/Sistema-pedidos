import {
  agregarItem,
  calcularTotales,
  cambiarCantidad,
  cantidadTotal,
  itemCarritoSchema,
  sincronizarCarrito,
  type ItemCarrito,
  type MenuComercio,
} from '@pedidos/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { leerJson, escribirJson } from '../lib/almacenamiento';

export type ClaveItem = Pick<ItemCarrito, 'productoId' | 'varianteId'>;

export interface Carrito {
  items: ItemCarrito[];
  cantidad: number;
  subtotal: number;
  agregar: (item: ItemCarrito) => void;
  cambiarCantidad: (clave: ClaveItem, cantidad: number) => void;
  vaciar: () => void;
}

const itemsGuardadosSchema = z.array(itemCarritoSchema);

export const claveCarrito = (slug: string) => `carrito:${slug}`;

/**
 * Carrito de un comercio, guardado en localStorage (cada comercio tiene el suyo).
 * Al cargar, se sincroniza con el menú actual: precios vigentes y sin productos que ya no existen.
 */
export function useCarrito(menu: MenuComercio): Carrito {
  const clave = claveCarrito(menu.slug);

  const [items, setItems] = useState<ItemCarrito[]>(() =>
    sincronizarCarrito(leerJson(clave, itemsGuardadosSchema) ?? [], menu),
  );

  useEffect(() => {
    escribirJson(clave, items.length > 0 ? items : null);
  }, [clave, items]);

  const agregar = useCallback(
    (item: ItemCarrito) => setItems((prev) => agregarItem(prev, item)),
    [],
  );
  const cambiar = useCallback(
    (c: ClaveItem, cantidad: number) => setItems((prev) => cambiarCantidad(prev, c, cantidad)),
    [],
  );
  const vaciar = useCallback(() => setItems([]), []);

  return useMemo(
    () => ({
      items,
      cantidad: cantidadTotal(items),
      subtotal: calcularTotales(items, 'RETIRO').subtotal,
      agregar,
      cambiarCantidad: cambiar,
      vaciar,
    }),
    [items, agregar, cambiar, vaciar],
  );
}
