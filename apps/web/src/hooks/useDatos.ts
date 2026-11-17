import { useEffect, useState } from 'react';

export type EstadoDatos<T> =
  { estado: 'cargando' } | { estado: 'ok'; datos: T } | { estado: 'error'; error: Error };

/**
 * Carga datos asíncronos y se re-ejecuta cuando cambia `clave`.
 * Alcanza mientras la app tenga pocas pantallas; si crece (caché, reintentos, refresco),
 * conviene pasar a TanStack Query.
 */
export function useDatos<T>(clave: string, cargar: () => Promise<T>): EstadoDatos<T> {
  const [resultado, setResultado] = useState<EstadoDatos<T> & { clave: string }>({
    estado: 'cargando',
    clave,
  });

  useEffect(() => {
    let vigente = true;
    cargar().then(
      (datos) => vigente && setResultado({ estado: 'ok', datos, clave }),
      (e: unknown) =>
        vigente &&
        setResultado({
          estado: 'error',
          error: e instanceof Error ? e : new Error(String(e)),
          clave,
        }),
    );
    return () => {
      vigente = false;
    };
    // `cargar` suele ser una función inline: la recarga la controla `clave`.
  }, [clave]);

  // Si cambió la clave y todavía no llegó la respuesta nueva, no mostramos datos viejos
  return resultado.clave === clave ? resultado : { estado: 'cargando' };
}
