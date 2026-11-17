import type { z } from 'zod';

/**
 * localStorage tolerante a fallos: en modo privado o con el almacenamiento bloqueado
 * puede tirar excepciones. En ese caso la app sigue funcionando, solo que sin recordar.
 * Lo leído se valida con un schema: si alguien (o una versión vieja de la app) dejó
 * datos con otra forma, se ignoran.
 */
export function leerJson<T>(clave: string, schema: z.ZodType<T>): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    if (crudo === null) return null;
    const r = schema.safeParse(JSON.parse(crudo));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** Guarda `valor` como JSON; con null borra la clave. */
export function escribirJson(clave: string, valor: unknown): void {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: no es un error para el usuario
  }
}
