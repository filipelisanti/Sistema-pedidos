import { construirLinkWhatsapp, formatearPrecio, generarMensajePedido } from '@pedidos/shared';
import { useEffect, useState } from 'react';

/**
 * Pantalla provisoria del Sprint 0: comprueba que el front usa @pedidos/shared
 * y que se comunica con la API. En el Sprint 1 se reemplaza por el menú real.
 */
const pedidoDemo = generarMensajePedido({
  comercio: 'Pizzería Don Luis',
  cliente: 'Cliente de prueba',
  tipoEntrega: 'RETIRO',
  items: [
    {
      productoId: 1,
      varianteId: 1,
      nombre: 'Muzzarella',
      variante: 'Grande',
      precioUnitario: 12000,
      cantidad: 1,
    },
  ],
  formaPago: 'EFECTIVO',
});

export function App() {
  const [api, setApi] = useState<'cargando' | 'ok' | 'error'>('cargando');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => setApi(r.ok ? 'ok' : 'error'))
      .catch(() => setApi('error'));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Pedidos por WhatsApp</h1>
      <p className="text-sm text-stone-600">Sprint 0 — estructura del proyecto funcionando.</p>

      <p className="rounded-lg bg-white p-3 text-sm shadow-sm">
        API:{' '}
        <strong className={api === 'ok' ? 'text-green-700' : 'text-red-700'}>
          {api === 'cargando' ? '...' : api === 'ok' ? 'conectada' : 'sin conexión'}
        </strong>
      </p>

      <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs whitespace-pre-wrap shadow-sm">
        {pedidoDemo}
      </pre>

      <a
        href={construirLinkWhatsapp('5491112345678', pedidoDemo)}
        target="_blank"
        rel="noreferrer"
        className="sticky bottom-4 rounded-xl bg-green-600 py-4 text-center text-lg font-semibold text-white active:bg-green-700"
      >
        Enviar pedido de prueba ({formatearPrecio(12000)})
      </a>
    </main>
  );
}
