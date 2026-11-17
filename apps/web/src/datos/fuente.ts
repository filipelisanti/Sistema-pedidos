import {
  comercioResumenSchema,
  menuComercioSchema,
  type ComercioResumen,
  type MenuComercio,
} from '@pedidos/shared';
import { z } from 'zod';

/**
 * Punto único de acceso a los datos públicos (API de Nest).
 * Las respuestas se validan con los schemas de @pedidos/shared: si la API cambia
 * de forma incompatible, falla acá con un error claro en vez de romper una pantalla.
 */

/** En desarrollo, Vite redirige /api a la API (ver vite.config.ts). En producción se puede apuntar a otro dominio. */
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function pedir(ruta: string): Promise<Response> {
  const res = await fetch(`${API_URL}${ruta}`, { headers: { Accept: 'application/json' } });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Error ${res.status} al pedir ${ruta}`);
  }
  return res;
}

export async function obtenerComercios(): Promise<ComercioResumen[]> {
  const res = await pedir('/comercios');
  return z.array(comercioResumenSchema).parse(await res.json());
}

/** null si no existe un comercio activo con ese slug. */
export async function obtenerMenu(slug: string): Promise<MenuComercio | null> {
  const res = await pedir(`/comercios/${encodeURIComponent(slug)}/menu`);
  if (res.status === 404) return null;
  return menuComercioSchema.parse(await res.json());
}
