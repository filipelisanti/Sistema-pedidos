import { z } from 'zod';

/**
 * Los precios se manejan en PESOS ENTEROS (sin centavos).
 * En Argentina los comercios no cobran centavos, y trabajar con enteros
 * evita los errores de redondeo de los float (0.1 + 0.2 !== 0.3).
 */
export const precioSchema = z.number().int().nonnegative();

export const TipoEntrega = z.enum(['ENVIO', 'RETIRO']);
export type TipoEntrega = z.infer<typeof TipoEntrega>;

export const FormaPago = z.enum(['EFECTIVO', 'TRANSFERENCIA']);
export type FormaPago = z.infer<typeof FormaPago>;

export const EstadoComercio = z.enum(['PENDIENTE', 'ACTIVO', 'SUSPENDIDO']);
export type EstadoComercio = z.infer<typeof EstadoComercio>;

export const Rol = z.enum(['SUPERADMIN', 'COMERCIO_ADMIN']);
export type Rol = z.infer<typeof Rol>;

/** Un renglón del carrito. La clave única es productoId + varianteId. */
export const itemCarritoSchema = z.object({
  productoId: z.number().int().positive(),
  varianteId: z.number().int().positive().nullable(),
  nombre: z.string().min(1),
  /** Ej: "Docena", "Grande". Null si el producto no tiene variantes. */
  variante: z.string().min(1).nullable(),
  precioUnitario: precioSchema,
  cantidad: z.number().int().min(1).max(99),
  /** Aclaración por ítem, ej: "sin aceitunas". */
  nota: z.string().max(140).optional(),
});
export type ItemCarrito = z.infer<typeof itemCarritoSchema>;

/** Datos que completa el cliente en el checkout. */
export const checkoutSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Ingresá tu nombre').max(60),
    tipoEntrega: TipoEntrega,
    direccion: z.string().trim().max(150).optional(),
    zonaEnvioId: z.number().int().positive().optional(),
    formaPago: FormaPago,
    /** Si paga en efectivo, con cuánto abona (para que lleven cambio). */
    abonaCon: precioSchema.optional(),
    observaciones: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipoEntrega === 'ENVIO') {
      if (!data.direccion || data.direccion.length < 5) {
        ctx.addIssue({
          code: 'custom',
          path: ['direccion'],
          message: 'Ingresá la dirección de entrega',
        });
      }
      if (data.zonaEnvioId === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['zonaEnvioId'],
          message: 'Elegí la zona de envío',
        });
      }
    }
    if (data.formaPago !== 'EFECTIVO' && data.abonaCon !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['abonaCon'],
        message: '"Abona con" solo aplica a pagos en efectivo',
      });
    }
  });
export type Checkout = z.infer<typeof checkoutSchema>;

/** Franja horaria de atención. diaSemana: 0 = domingo ... 6 = sábado (igual que Date#getDay). */
export const horarioSchema = z.object({
  diaSemana: z.number().int().min(0).max(6),
  /** "HH:MM" en 24 hs */
  abre: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  cierra: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type Horario = z.infer<typeof horarioSchema>;
