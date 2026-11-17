const formatoPesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** 24000 -> "$24.000" */
export function formatearPrecio(pesos: number): string {
  return `$${formatoPesos.format(pesos)}`;
}
