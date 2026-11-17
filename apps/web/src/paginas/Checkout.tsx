import {
  armarPedido,
  calcularTotales,
  checkoutSchema,
  construirLinkWhatsapp,
  estaAbierto,
  faltanteParaMinimo,
  formatearPrecio,
  generarMensajePedido,
  subtotalItem,
  type FormaPago,
  type TipoEntrega,
} from '@pedidos/shared';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { Cantidad } from '../componentes/Cantidad';
import { escribirJson, leerJson } from '../lib/almacenamiento';
import { useComercio } from './ComercioLayout';

/** Nombre y dirección se recuerdan entre pedidos (solo en este celular). */
const CLAVE_CLIENTE = 'datos-cliente';
const datosClienteSchema = z.object({ nombre: z.string(), direccion: z.string() });

type CampoForm =
  | 'nombre'
  | 'direccion'
  | 'zonaEnvioId'
  | 'abonaCon'
  | 'observaciones'
  | 'tipoEntrega'
  | 'formaPago';

const MENSAJES: Record<CampoForm, string> = {
  nombre: 'Ingresá tu nombre',
  direccion: 'Ingresá la dirección de entrega',
  zonaEnvioId: 'Elegí la zona de envío',
  abonaCon: 'Ingresá un monto válido',
  observaciones: 'Máximo 300 caracteres',
  tipoEntrega: 'Elegí cómo recibís el pedido',
  formaPago: 'Elegí cómo pagás',
};

const inputClase = 'rounded-lg border border-stone-300 bg-white p-3 font-normal';

export function Checkout() {
  const { menu, carrito } = useComercio();
  const navigate = useNavigate();

  const [guardado] = useState(() => leerJson(CLAVE_CLIENTE, datosClienteSchema));
  const [nombre, setNombre] = useState(guardado?.nombre ?? '');
  const [direccion, setDireccion] = useState(guardado?.direccion ?? '');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(
    menu.aceptaEnvio ? 'ENVIO' : 'RETIRO',
  );
  const [zonaEnvioId, setZonaEnvioId] = useState(
    menu.zonasEnvio.length === 1 ? String(menu.zonasEnvio[0]!.id) : '',
  );
  const [formaPago, setFormaPago] = useState<FormaPago>('EFECTIVO');
  const [abonaCon, setAbonaCon] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [errores, setErrores] = useState<Partial<Record<CampoForm, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  /** Link de WhatsApp del pedido ya enviado: muestra la pantalla de confirmación. */
  const [linkEnviado, setLinkEnviado] = useState<string | null>(null);

  const zona = menu.zonasEnvio.find((z) => String(z.id) === zonaEnvioId);
  const { subtotal, envio, total } = calcularTotales(carrito.items, tipoEntrega, zona?.costo ?? 0);
  const faltante = faltanteParaMinimo(subtotal, menu.pedidoMinimo);

  if (linkEnviado) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold">¡Listo! Terminá de enviarlo en WhatsApp</h1>
        <p className="text-stone-600">
          Se abrió WhatsApp con tu pedido para {menu.nombre}. Tocá “Enviar” ahí para que les llegue.
        </p>
        <a
          href={linkEnviado}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-green-600 py-3 font-semibold text-green-700"
        >
          No se abrió: abrir WhatsApp de nuevo
        </a>
        <button
          type="button"
          onClick={() => {
            carrito.vaciar();
            navigate(`/c/${menu.slug}`);
          }}
          className="rounded-xl bg-green-600 py-3 font-semibold text-white active:bg-green-700"
        >
          Ya lo envié, vaciar carrito
        </button>
        <button
          type="button"
          onClick={() => setLinkEnviado(null)}
          className="text-sm text-stone-600 underline"
        >
          Volver al pedido
        </button>
      </main>
    );
  }

  if (carrito.items.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-bold">Tu pedido está vacío</h1>
        <Link
          to={`/c/${menu.slug}`}
          className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white"
        >
          Ver el menú
        </Link>
      </main>
    );
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErrorGeneral(null);

    const esEnvio = tipoEntrega === 'ENVIO';
    const esEfectivo = formaPago === 'EFECTIVO';
    const r = checkoutSchema.safeParse({
      nombre,
      tipoEntrega,
      direccion: esEnvio ? direccion.trim() || undefined : undefined,
      zonaEnvioId: esEnvio && zonaEnvioId ? Number(zonaEnvioId) : undefined,
      formaPago,
      abonaCon: esEfectivo && abonaCon.trim() ? Number(abonaCon) : undefined,
      observaciones: observaciones.trim() || undefined,
    });

    const nuevos: Partial<Record<CampoForm, string>> = {};
    if (!r.success) {
      for (const issue of r.error.issues) {
        const campo = issue.path[0] as CampoForm;
        nuevos[campo] ??= MENSAJES[campo] ?? issue.message;
      }
    } else if (r.data.abonaCon !== undefined && r.data.abonaCon < total) {
      nuevos.abonaCon = `Tiene que ser al menos el total (${formatearPrecio(total)})`;
    }
    setErrores(nuevos);
    if (!r.success || Object.keys(nuevos).length > 0) return;

    const pedido = armarPedido(menu, carrito.items, r.data);
    if (!pedido.ok) {
      setErrorGeneral(pedido.error);
      return;
    }

    escribirJson(CLAVE_CLIENTE, {
      nombre: r.data.nombre,
      direccion: esEnvio ? (r.data.direccion ?? '') : (guardado?.direccion ?? ''),
    });
    const link = construirLinkWhatsapp(menu.whatsapp, generarMensajePedido(pedido.datos));
    window.open(link, '_blank', 'noopener');
    setLinkEnviado(link);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4 pb-8">
      <header>
        <Link to={`/c/${menu.slug}`} className="text-sm text-green-700">
          ← Seguir agregando
        </Link>
        <h1 className="text-2xl font-bold">Tu pedido</h1>
        <p className="text-sm text-stone-600">{menu.nombre}</p>
      </header>

      {!estaAbierto(menu.horarios) && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          El comercio está cerrado ahora: te van a responder cuando abra.
        </p>
      )}

      <ul className="flex flex-col gap-2" aria-label="Productos del pedido">
        {carrito.items.map((item) => (
          <li
            key={`${item.productoId}-${item.varianteId}`}
            className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm"
          >
            <div className="flex justify-between gap-2">
              <span>
                <span className="font-semibold">{item.nombre}</span>
                {item.variante && <span className="text-stone-600"> ({item.variante})</span>}
                {item.nota && (
                  <span className="block text-sm text-stone-500 italic">{item.nota}</span>
                )}
              </span>
              <span className="font-semibold tabular-nums">
                {formatearPrecio(subtotalItem(item))}
              </span>
            </div>
            <Cantidad
              valor={item.cantidad}
              minimo={0}
              etiqueta={`Cantidad de ${item.nombre}`}
              onCambiar={(n) => carrito.cambiarCantidad(item, n)}
            />
          </li>
        ))}
      </ul>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo etiqueta="Tu nombre" error={errores.nombre}>
          <input
            type="text"
            autoComplete="name"
            value={nombre}
            maxLength={60}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClase}
          />
        </Campo>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">¿Cómo lo recibís?</legend>
          <div className="grid grid-cols-2 gap-2">
            {menu.aceptaEnvio && (
              <Opcion
                nombre="tipoEntrega"
                marcada={tipoEntrega === 'ENVIO'}
                onElegir={() => setTipoEntrega('ENVIO')}
              >
                Envío
              </Opcion>
            )}
            {menu.aceptaRetiro && (
              <Opcion
                nombre="tipoEntrega"
                marcada={tipoEntrega === 'RETIRO'}
                onElegir={() => setTipoEntrega('RETIRO')}
              >
                Retiro en el local
              </Opcion>
            )}
          </div>
        </fieldset>

        {tipoEntrega === 'ENVIO' && (
          <>
            <Campo etiqueta="Zona de envío" error={errores.zonaEnvioId}>
              <select
                value={zonaEnvioId}
                onChange={(e) => setZonaEnvioId(e.target.value)}
                className={inputClase}
              >
                <option value="">Elegí tu zona</option>
                {menu.zonasEnvio.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre} — {formatearPrecio(z.costo)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Dirección" error={errores.direccion}>
              <input
                type="text"
                autoComplete="street-address"
                value={direccion}
                maxLength={150}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, piso/depto"
                className={inputClase}
              />
            </Campo>
          </>
        )}

        {tipoEntrega === 'RETIRO' && menu.direccion && (
          <p className="text-sm text-stone-600">Retirás en: {menu.direccion}</p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">¿Cómo pagás?</legend>
          <div className="grid grid-cols-2 gap-2">
            <Opcion
              nombre="formaPago"
              marcada={formaPago === 'EFECTIVO'}
              onElegir={() => setFormaPago('EFECTIVO')}
            >
              Efectivo
            </Opcion>
            <Opcion
              nombre="formaPago"
              marcada={formaPago === 'TRANSFERENCIA'}
              onElegir={() => setFormaPago('TRANSFERENCIA')}
            >
              Transferencia
            </Opcion>
          </div>
        </fieldset>

        {formaPago === 'EFECTIVO' && (
          <Campo etiqueta="¿Con cuánto abonás? (opcional)" error={errores.abonaCon}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={abonaCon}
              onChange={(e) => setAbonaCon(e.target.value)}
              placeholder="Para que lleven cambio"
              className={inputClase}
            />
          </Campo>
        )}

        <Campo etiqueta="Observaciones (opcional)" error={errores.observaciones}>
          <textarea
            value={observaciones}
            maxLength={300}
            rows={2}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: tocar timbre 2B"
            className={inputClase}
          />
        </Campo>

        <dl className="flex flex-col gap-1 rounded-xl bg-white p-4 shadow-sm">
          {tipoEntrega === 'ENVIO' && (
            <>
              <Fila nombre="Subtotal" valor={formatearPrecio(subtotal)} />
              <Fila nombre="Envío" valor={zona ? formatearPrecio(envio) : 'Elegí tu zona'} />
            </>
          )}
          <Fila nombre="Total" valor={formatearPrecio(total)} destacada />
        </dl>

        {faltante > 0 && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            El pedido mínimo es de {formatearPrecio(menu.pedidoMinimo)}. Te faltan{' '}
            {formatearPrecio(faltante)}.
          </p>
        )}
        {errorGeneral && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {errorGeneral}
          </p>
        )}

        <button
          type="submit"
          disabled={faltante > 0}
          className="rounded-xl bg-green-600 py-4 text-lg font-semibold text-white active:bg-green-700 disabled:opacity-50"
        >
          Enviar pedido por WhatsApp
        </button>
      </form>
    </main>
  );
}

function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {etiqueta}
      {children}
      {error && <span className="font-normal text-red-700">{error}</span>}
    </label>
  );
}

function Opcion({
  nombre,
  marcada,
  onElegir,
  children,
}: {
  nombre: string;
  marcada: boolean;
  onElegir: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white p-3 text-sm has-checked:border-green-600 has-checked:bg-green-50">
      <input
        type="radio"
        name={nombre}
        checked={marcada}
        onChange={onElegir}
        className="accent-green-600"
      />
      {children}
    </label>
  );
}

function Fila({
  nombre,
  valor,
  destacada,
}: {
  nombre: string;
  valor: string;
  destacada?: boolean;
}) {
  return (
    <div className={`flex justify-between ${destacada ? 'text-lg font-bold' : 'text-stone-600'}`}>
      <dt>{nombre}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}
