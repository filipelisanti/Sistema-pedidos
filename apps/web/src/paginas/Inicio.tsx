import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EstadoAbierto } from '../componentes/EstadoAbierto';
import { obtenerComercios } from '../datos/fuente';
import { useDatos } from '../hooks/useDatos';

/** "Pizzería" -> "pizzeria": para buscar sin importar tildes ni mayúsculas. */
const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Inicio() {
  const datos = useDatos('comercios', obtenerComercios);
  const [busqueda, setBusqueda] = useState('');

  const comercios = useMemo(() => {
    if (datos.estado !== 'ok') return [];
    const q = normalizar(busqueda.trim());
    if (!q) return datos.datos;
    return datos.datos.filter((c) =>
      normalizar(`${c.nombre} ${c.rubro} ${c.localidad}`).includes(q),
    );
  }, [datos, busqueda]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">¿Qué pedimos hoy?</h1>
        <p className="text-sm text-stone-600">Armá tu pedido y mandalo por WhatsApp.</p>
      </header>

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, rubro o localidad"
        aria-label="Buscar comercios"
        className="rounded-xl border border-stone-300 bg-white p-3"
      />

      {datos.estado === 'cargando' && <p className="text-stone-500">Cargando comercios…</p>}
      {datos.estado === 'error' && (
        <p className="text-red-700">No pudimos cargar los comercios. Probá de nuevo.</p>
      )}
      {datos.estado === 'ok' && comercios.length === 0 && (
        <p className="text-stone-500">No encontramos comercios para “{busqueda}”.</p>
      )}

      <ul className="flex flex-col gap-3">
        {comercios.map((c) => (
          <li key={c.id}>
            <Link
              to={`/c/${c.slug}`}
              className="flex flex-col gap-1 rounded-xl bg-white p-4 shadow-sm active:bg-stone-100"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{c.nombre}</span>
                <EstadoAbierto horarios={c.horarios} />
              </span>
              <span className="text-sm text-stone-600">
                {c.rubro} · {c.localidad}
              </span>
              <span className="text-xs text-stone-500">
                {[c.aceptaEnvio && 'Envío a domicilio', c.aceptaRetiro && 'Retiro en el local']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
