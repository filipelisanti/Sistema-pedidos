import { vi } from 'vitest';
import { MENUS_MOCK } from './datos-mock';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Reemplaza `fetch` por una API falsa que responde como la de Nest con los datos de prueba.
 * Devuelve el mock para poder inspeccionar llamadas o forzar errores en un test.
 */
export function instalarApiFalsa() {
  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL): Promise<Response> => {
    const ruta = new URL(String(entrada), 'http://localhost').pathname;

    if (ruta === '/api/comercios') {
      return json(
        MENUS_MOCK.map(
          ({
            whatsapp: _w,
            direccion: _d,
            pedidoMinimo: _p,
            zonasEnvio: _z,
            categorias: _c,
            ...r
          }) => r,
        ),
      );
    }

    const menu = /^\/api\/comercios\/([^/]+)\/menu$/.exec(ruta);
    if (menu) {
      const encontrado = MENUS_MOCK.find((m) => m.slug === decodeURIComponent(menu[1]!));
      return encontrado
        ? json(encontrado)
        : json({ statusCode: 404, message: 'Comercio no encontrado' }, 404);
    }

    return json({ statusCode: 404 }, 404);
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}
