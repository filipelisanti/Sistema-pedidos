import { calcularTotales, subtotalItem } from './carrito';
import { formatearPrecio } from './formato';
import type { FormaPago, ItemCarrito, TipoEntrega } from './schemas';

export interface DatosMensajePedido {
  comercio: string;
  cliente: string;
  tipoEntrega: TipoEntrega;
  /** Obligatorio si tipoEntrega === 'ENVIO' */
  direccion?: string;
  /** Nombre de la zona, ej "Centro". Solo para envío. */
  zona?: string;
  costoEnvio?: number;
  items: readonly ItemCarrito[];
  formaPago: FormaPago;
  abonaCon?: number;
  observaciones?: string;
}

const NOMBRE_PAGO: Record<FormaPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
};

/**
 * WhatsApp usa *texto* para negrita. Si el cliente escribe asteriscos u otros
 * caracteres de formato (_ ~ `) en sus datos, los quitamos para que no rompan el formato.
 */
function limpiar(texto: string): string {
  return texto.replace(/[*_~`]/g, '').trim();
}

function lineaItem(item: ItemCarrito): string {
  const variante = item.variante ? ` (${limpiar(item.variante)})` : '';
  const nota = item.nota ? `\n   _${limpiar(item.nota)}_` : '';
  return `• ${item.cantidad}x ${limpiar(item.nombre)}${variante} — ${formatearPrecio(subtotalItem(item))}${nota}`;
}

/** Arma el texto del pedido que se envía por WhatsApp. Función pura: fácil de testear. */
export function generarMensajePedido(datos: DatosMensajePedido): string {
  if (datos.items.length === 0) {
    throw new Error('No se puede generar un pedido sin productos');
  }
  if (datos.tipoEntrega === 'ENVIO' && !datos.direccion?.trim()) {
    throw new Error('El pedido con envío necesita una dirección');
  }

  const { subtotal, envio, total } = calcularTotales(
    datos.items,
    datos.tipoEntrega,
    datos.costoEnvio ?? 0,
  );

  const entrega =
    datos.tipoEntrega === 'ENVIO'
      ? `Envío a domicilio${datos.zona ? ` (${limpiar(datos.zona)})` : ''}`
      : 'Retiro en el local';

  const lineas: string[] = [
    `*Nuevo pedido - ${limpiar(datos.comercio)}*`,
    '',
    `*Cliente:* ${limpiar(datos.cliente)}`,
    `*Entrega:* ${entrega}`,
  ];

  if (datos.tipoEntrega === 'ENVIO') {
    lineas.push(`*Dirección:* ${limpiar(datos.direccion!)}`);
  }

  lineas.push('', '*Pedido:*', ...datos.items.map(lineaItem), '');

  if (datos.tipoEntrega === 'ENVIO') {
    lineas.push(`Subtotal: ${formatearPrecio(subtotal)}`, `Envío: ${formatearPrecio(envio)}`);
  }
  lineas.push(`*Total: ${formatearPrecio(total)}*`, '');

  let pago = NOMBRE_PAGO[datos.formaPago];
  if (datos.formaPago === 'EFECTIVO' && datos.abonaCon !== undefined && datos.abonaCon > total) {
    pago += ` (abona con ${formatearPrecio(datos.abonaCon)})`;
  }
  lineas.push(`*Pago:* ${pago}`);

  const obs = datos.observaciones ? limpiar(datos.observaciones) : '';
  if (obs) lineas.push(`*Observaciones:* ${obs}`);

  return lineas.join('\n');
}
