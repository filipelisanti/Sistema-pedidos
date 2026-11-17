import type { MenuComercio } from '@pedidos/shared';
import { Outlet, useOutletContext, useParams } from 'react-router';
import { useCarrito, type Carrito } from '../carrito/useCarrito';
import { obtenerMenu } from '../datos/fuente';
import { useDatos } from '../hooks/useDatos';
import { NoEncontrado } from './NoEncontrado';

export interface ContextoComercio {
  menu: MenuComercio;
  carrito: Carrito;
}

/** Para las páginas hijas de /c/:slug (menú y checkout). */
export const useComercio = () => useOutletContext<ContextoComercio>();

/** Carga el menú del comercio una sola vez y lo comparte, junto con el carrito, con menú y checkout. */
export function ComercioLayout() {
  const { slug = '' } = useParams();
  const datos = useDatos(`menu:${slug}`, () => obtenerMenu(slug));

  if (datos.estado === 'cargando') {
    return <p className="p-4 text-stone-500">Cargando menú…</p>;
  }
  if (datos.estado === 'error') {
    return <p className="p-4 text-red-700">No pudimos cargar el menú. Probá de nuevo.</p>;
  }
  if (!datos.datos) return <NoEncontrado />;

  // key: si cambia el comercio, el carrito se vuelve a crear con el del nuevo comercio
  return <ComercioCargado key={datos.datos.slug} menu={datos.datos} />;
}

function ComercioCargado({ menu }: { menu: MenuComercio }) {
  const carrito = useCarrito(menu);
  return <Outlet context={{ menu, carrito } satisfies ContextoComercio} />;
}
