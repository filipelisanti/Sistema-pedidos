import {
  comercioResumenSchema,
  menuComercioSchema,
  type ComercioResumen,
  type MenuComercio,
} from '@pedidos/shared';
import { MENUS_MOCK } from './mock';

/**
 * Punto único de acceso a los datos públicos.
 * Sprint 1: lee los mocks. Sprint 2: hace fetch a la API y valida con los mismos schemas,
 * sin tocar las pantallas.
 */

export async function obtenerComercios(): Promise<ComercioResumen[]> {
  return MENUS_MOCK.map((m) => comercioResumenSchema.parse(m));
}

/** null si no existe un comercio activo con ese slug. */
export async function obtenerMenu(slug: string): Promise<MenuComercio | null> {
  const menu = MENUS_MOCK.find((m) => m.slug === slug);
  return menu ? menuComercioSchema.parse(menu) : null;
}
