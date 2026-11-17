import { formatearPrecio, type ItemCarrito, type ProductoMenu } from '@pedidos/shared';
import { useEffect, useId, useState } from 'react';
import { Cantidad } from './Cantidad';

interface Props {
  producto: ProductoMenu;
  onAgregar: (item: ItemCarrito) => void;
  onCerrar: () => void;
}

/** Hoja inferior (bottom sheet) para elegir variante, cantidad y aclaración de un producto. */
export function SelectorProducto({ producto, onAgregar, onCerrar }: Props) {
  const tituloId = useId();
  const [varianteId, setVarianteId] = useState<number | null>(producto.variantes[0]?.id ?? null);
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');

  const variante = producto.variantes.find((v) => v.id === varianteId) ?? null;
  const precioUnitario = variante?.precio ?? producto.precio;

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  const agregar = () => {
    const notaLimpia = nota.trim();
    onAgregar({
      productoId: producto.id,
      varianteId: variante?.id ?? null,
      nombre: producto.nombre,
      variante: variante?.nombre ?? null,
      precioUnitario,
      cantidad,
      ...(notaLimpia ? { nota: notaLimpia } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40"
        onClick={onCerrar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="relative flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div>
          <h2 id={tituloId} className="text-xl font-bold">
            {producto.nombre}
          </h2>
          {producto.descripcion && (
            <p className="mt-1 text-sm text-stone-600">{producto.descripcion}</p>
          )}
        </div>

        {producto.variantes.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Elegí una opción</legend>
            {producto.variantes.map((v) => (
              <label
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 p-3 has-checked:border-green-600 has-checked:bg-green-50"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="variante"
                    checked={v.id === varianteId}
                    onChange={() => setVarianteId(v.id)}
                    className="accent-green-600"
                  />
                  {v.nombre}
                </span>
                <span className="tabular-nums">{formatearPrecio(v.precio)}</span>
              </label>
            ))}
          </fieldset>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Aclaración (opcional)
          <input
            type="text"
            value={nota}
            maxLength={140}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej: sin aceitunas"
            className="rounded-lg border border-stone-300 p-3 font-normal"
          />
        </label>

        <div className="flex items-center justify-between gap-4">
          <Cantidad valor={cantidad} onCambiar={setCantidad} etiqueta="Cantidad" />
          <button
            type="button"
            onClick={agregar}
            className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white active:bg-green-700"
          >
            Agregar {formatearPrecio(precioUnitario * cantidad)}
          </button>
        </div>
      </div>
    </div>
  );
}
