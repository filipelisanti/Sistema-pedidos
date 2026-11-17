import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { claveCarrito } from '../src/carrito/useCarrito';
import { instalarApiFalsa } from './api-falsa';
import { renderApp } from './utils';

const DON_LUIS = '/c/pizzeria-don-luis';

/** Abre un producto del menú, elige variante (opcional) y lo agrega. */
async function agregar(
  usuario: ReturnType<typeof renderApp>['usuario'],
  producto: string,
  variante?: string,
) {
  await usuario.click(await screen.findByRole('button', { name: new RegExp(`^${producto}`) }));
  const dialogo = screen.getByRole('dialog');
  if (variante)
    await usuario.click(within(dialogo).getByRole('radio', { name: new RegExp(`^${variante}`) }));
  await usuario.click(within(dialogo).getByRole('button', { name: /^Agregar/ }));
}

function abrirWhatsappMock() {
  return vi.spyOn(window, 'open').mockImplementation(() => null);
}

describe('buscador', () => {
  it('lista solo comercios activos y filtra sin importar tildes', async () => {
    const { usuario } = renderApp('/');
    expect(await screen.findByText('Pizzería Don Luis')).toBeInTheDocument();
    expect(screen.getByText('Empanadas La Tucumana')).toBeInTheDocument();
    expect(screen.queryByText('Burger Norte')).not.toBeInTheDocument();

    await usuario.type(screen.getByRole('searchbox'), 'pizzeria');
    expect(screen.getByText('Pizzería Don Luis')).toBeInTheDocument();
    expect(screen.queryByText('Empanadas La Tucumana')).not.toBeInTheDocument();
  });
});

describe('menú', () => {
  it('muestra 404 para un slug inexistente', async () => {
    renderApp('/c/no-existe');
    expect(await screen.findByText('No encontramos esta página')).toBeInTheDocument();
  });

  it('no deja pedir productos sin stock', async () => {
    renderApp(DON_LUIS);
    expect(await screen.findByRole('button', { name: /Humita/ })).toBeDisabled();
  });

  it('agrega productos con variante y muestra el total en la barra', async () => {
    const { usuario } = renderApp(DON_LUIS);
    await agregar(usuario, 'Muzzarella', 'Chica');
    await agregar(usuario, 'Muzzarella', 'Chica');

    expect(screen.getByRole('link', { name: /Ver pedido \(2 productos\)/ })).toHaveTextContent(
      '$18.000',
    );
  });

  it('guarda el carrito en localStorage', async () => {
    const { usuario } = renderApp(DON_LUIS);
    await agregar(usuario, 'Fugazzeta');
    const guardado = JSON.parse(localStorage.getItem(claveCarrito('pizzeria-don-luis')) ?? '[]');
    expect(guardado).toMatchObject([{ nombre: 'Fugazzeta rellena', cantidad: 1 }]);
  });

  it('al cargar un carrito guardado usa el precio vigente', async () => {
    localStorage.setItem(
      claveCarrito('pizzeria-don-luis'),
      JSON.stringify([
        {
          productoId: 3,
          varianteId: null,
          nombre: 'Fugazzeta rellena',
          variante: null,
          precioUnitario: 1, // precio viejo
          cantidad: 1,
        },
      ]),
    );
    renderApp(DON_LUIS);
    expect(await screen.findByRole('link', { name: /Ver pedido/ })).toHaveTextContent('$16.500');
  });
});

describe('checkout', () => {
  it('con carrito vacío ofrece volver al menú', async () => {
    renderApp(`${DON_LUIS}/checkout`);
    expect(await screen.findByText('Tu pedido está vacío')).toBeInTheDocument();
  });

  it('valida los datos de envío antes de enviar', async () => {
    const open = abrirWhatsappMock();
    const { usuario } = renderApp(DON_LUIS);
    await agregar(usuario, 'Fugazzeta');
    await usuario.click(screen.getByRole('link', { name: /Ver pedido/ }));

    await usuario.click(await screen.findByRole('button', { name: /Enviar pedido/ }));

    expect(screen.getByText('Ingresá tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Elegí la zona de envío')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la dirección de entrega')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it('bloquea el envío si no llega al pedido mínimo', async () => {
    const { usuario } = renderApp(DON_LUIS);
    await agregar(usuario, 'Gaseosa');
    await usuario.click(screen.getByRole('link', { name: /Ver pedido/ }));

    expect(await screen.findByText(/Te faltan \$4\.500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar pedido/ })).toBeDisabled();
  });

  it('envía un pedido con envío por WhatsApp con todo el detalle', async () => {
    const open = abrirWhatsappMock();
    const { usuario } = renderApp(DON_LUIS);
    await agregar(usuario, 'Muzzarella', 'Grande');
    await usuario.click(screen.getByRole('link', { name: /Ver pedido/ }));

    await usuario.type(await screen.findByLabelText('Tu nombre'), 'Ana');
    await usuario.selectOptions(screen.getByLabelText('Zona de envío'), '1');
    await usuario.type(screen.getByLabelText('Dirección'), 'Mitre 123');
    await usuario.type(screen.getByLabelText(/Con cuánto abonás/), '20000');
    expect(screen.getByText('$13.500')).toBeInTheDocument(); // 12.000 + 1.500 de envío

    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }));

    expect(open).toHaveBeenCalledOnce();
    const url = new URL(String(open.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/5491112345678');
    const mensaje = url.searchParams.get('text') ?? '';
    expect(mensaje).toContain('*Cliente:* Ana');
    expect(mensaje).toContain('Envío a domicilio (Centro (hasta 10 cuadras))');
    expect(mensaje).toContain('1x Muzzarella (Grande)');
    expect(mensaje).toContain('*Total: $13.500*');
    expect(mensaje).toContain('abona con $20.000');

    // Confirmación: vaciar el carrito vuelve al menú sin productos
    await usuario.click(screen.getByRole('button', { name: /vaciar carrito/ }));
    expect(await screen.findByRole('heading', { name: 'Pizzería Don Luis' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver pedido/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(claveCarrito('pizzeria-don-luis'))).toBeNull();
  });

  it('un comercio solo-retiro no ofrece envío', async () => {
    const open = abrirWhatsappMock();
    const { usuario } = renderApp('/c/empanadas-la-tucumana');
    await agregar(usuario, 'Pollo');
    await usuario.click(screen.getByRole('link', { name: /Ver pedido/ }));

    expect(await screen.findByRole('radio', { name: 'Retiro en el local' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Envío' })).not.toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Tu nombre'), 'Ana');
    await usuario.click(screen.getByRole('radio', { name: 'Transferencia' }));
    await usuario.click(screen.getByRole('button', { name: /Enviar pedido/ }));

    const mensaje = new URL(String(open.mock.calls[0]?.[0])).searchParams.get('text') ?? '';
    expect(mensaje).toContain('Retiro en el local');
    expect(mensaje).toContain('*Pago:* Transferencia');
  });
});

describe('errores de la API', () => {
  it('avisa si no puede cargar los comercios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp('/');
    expect(await screen.findByText(/No pudimos cargar los comercios/)).toBeInTheDocument();
  });

  it('avisa si la API responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    renderApp(DON_LUIS);
    expect(await screen.findByText(/No pudimos cargar el menú/)).toBeInTheDocument();
  });

  it('rechaza una respuesta que no cumple el contrato', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ nombre: 'incompleto' }))),
    );
    renderApp(DON_LUIS);
    expect(await screen.findByText(/No pudimos cargar el menú/)).toBeInTheDocument();
  });

  it('pide el menú del slug a la API', async () => {
    const fetchFalso = instalarApiFalsa();
    renderApp(DON_LUIS);
    await screen.findByRole('heading', { name: 'Pizzería Don Luis' });
    expect(fetchFalso).toHaveBeenCalledWith(
      '/api/comercios/pizzeria-don-luis/menu',
      expect.anything(),
    );
  });
});
