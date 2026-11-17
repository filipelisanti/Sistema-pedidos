import { estaAbierto, formatearPrecio, type ProductoMenu } from '@pedidos/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { EstadoAbierto } from '../componentes/EstadoAbierto';
import { SelectorProducto } from '../componentes/SelectorProducto';
import { useComercio } from './ComercioLayout';

function precioDesde(p: ProductoMenu): string {
  if (p.variantes.length === 0) return formatearPrecio(p.precio);
  const minimo = Math.min(...p.variantes.map((v) => v.precio));
  return p.variantes.length > 1 ? `desde ${formatearPrecio(minimo)}` : formatearPrecio(minimo);
}

export function Menu() {
  const { menu, carrito } = useComercio();
  const [elegido, setElegido] = useState<ProductoMenu | null>(null);
  const categorias = menu.categorias.filter((c) => c.productos.length > 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">
      <header className="flex flex-col gap-1 bg-white p-4 shadow-sm">
        <Link to="/" className="text-sm text-green-700">
          ← Comercios
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{menu.nombre}</h1>
          <EstadoAbierto horarios={menu.horarios} />
        </div>
        <p className="text-sm text-stone-600">
          {menu.rubro} · {menu.direccion ? `${menu.direccion}, ` : ''}
          {menu.localidad}
        </p>
        <p className="text-xs text-stone-500">
          {[menu.aceptaEnvio && 'Envío a domicilio', menu.aceptaRetiro && 'Retiro en el local']
            .filter(Boolean)
            .join(' · ')}
          {menu.pedidoMinimo > 0 && ` · Pedido mínimo ${formatearPrecio(menu.pedidoMinimo)}`}
        </p>
      </header>

      {!estaAbierto(menu.horarios) && (
        <p className="m-4 mb-0 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Ahora está cerrado. Podés armar y enviar el pedido igual, pero te van a responder cuando
          abra.
        </p>
      )}

      {categorias.length > 1 && (
        <nav
          aria-label="Categorías"
          className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-stone-50/95 p-4 backdrop-blur"
        >
          {categorias.map((c) => (
            <a
              key={c.id}
              href={`#categoria-${c.id}`}
              className="shrink-0 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm"
            >
              {c.nombre}
            </a>
          ))}
        </nav>
      )}

      {categorias.length === 0 && (
        <p className="p-4 text-stone-500">Este comercio todavía no cargó su menú.</p>
      )}

      {categorias.map((c) => (
        <section
          key={c.id}
          id={`categoria-${c.id}`}
          aria-labelledby={`titulo-categoria-${c.id}`}
          className="scroll-mt-16 px-4 pt-4"
        >
          <h2 id={`titulo-categoria-${c.id}`} className="mb-2 text-lg font-bold">
            {c.nombre}
          </h2>
          <ul className="flex flex-col gap-2">
            {c.productos.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!p.disponible}
                  onClick={() => setElegido(p)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl bg-white p-4 text-left shadow-sm active:bg-stone-100 disabled:opacity-60"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{p.nombre}</span>
                    {p.descripcion && (
                      <span className="text-sm text-stone-600">{p.descripcion}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                    {p.disponible ? precioDesde(p) : 'Sin stock'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {carrito.cantidad > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            to="checkout"
            className="flex items-center justify-between rounded-xl bg-green-600 px-4 py-4 font-semibold text-white shadow-lg active:bg-green-700"
          >
            <span>
              Ver pedido ({carrito.cantidad} {carrito.cantidad === 1 ? 'producto' : 'productos'})
            </span>
            <span className="tabular-nums">{formatearPrecio(carrito.subtotal)}</span>
          </Link>
        </div>
      )}

      {elegido && (
        <SelectorProducto
          producto={elegido}
          onCerrar={() => setElegido(null)}
          onAgregar={(item) => {
            carrito.agregar(item);
            setElegido(null);
          }}
        />
      )}
    </main>
  );
}
