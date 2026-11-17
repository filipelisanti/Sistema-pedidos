import { CANTIDAD_MAXIMA } from '@pedidos/shared';

interface Props {
  valor: number;
  onCambiar: (valor: number) => void;
  /** Cantidad mínima que permite el botón "−" (en el carrito es 0 = quitar). */
  minimo?: number;
  etiqueta: string;
}

/** Botones − / + grandes, cómodos para el pulgar. */
export function Cantidad({ valor, onCambiar, minimo = 1, etiqueta }: Props) {
  const boton =
    'grid size-9 place-items-center rounded-full border border-stone-300 bg-white text-lg font-semibold active:bg-stone-100 disabled:opacity-40';
  return (
    <div className="flex items-center gap-3" role="group" aria-label={etiqueta}>
      <button
        type="button"
        className={boton}
        onClick={() => onCambiar(valor - 1)}
        disabled={valor <= minimo}
        aria-label="Restar uno"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className={boton}
        onClick={() => onCambiar(valor + 1)}
        disabled={valor >= CANTIDAD_MAXIMA}
        aria-label="Sumar uno"
      >
        +
      </button>
    </div>
  );
}
