import { z } from 'zod';
import { horarioSchema, precioSchema } from './schemas';

/**
 * Contratos de las respuestas de la API pública.
 * En el Sprint 1 el front los usa con datos mock; en el Sprint 2 la API devuelve exactamente esto.
 */

const idSchema = z.number().int().positive();

/** Un comercio en el listado del buscador. */
export const comercioResumenSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  slug: z.string().min(1),
  rubro: z.string().min(1),
  localidad: z.string().min(1),
  logoUrl: z.string().nullable(),
  aceptaEnvio: z.boolean(),
  aceptaRetiro: z.boolean(),
  horarios: z.array(horarioSchema),
});
export type ComercioResumen = z.infer<typeof comercioResumenSchema>;

export const varianteMenuSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  precio: precioSchema,
});
export type VarianteMenu = z.infer<typeof varianteMenuSchema>;

export const productoMenuSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  descripcion: z.string().nullable(),
  /** Precio base; si hay variantes, manda el precio de cada variante. */
  precio: precioSchema,
  imagenUrl: z.string().nullable(),
  disponible: z.boolean(),
  variantes: z.array(varianteMenuSchema),
});
export type ProductoMenu = z.infer<typeof productoMenuSchema>;

export const categoriaMenuSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  productos: z.array(productoMenuSchema),
});
export type CategoriaMenu = z.infer<typeof categoriaMenuSchema>;

export const zonaEnvioMenuSchema = z.object({
  id: idSchema,
  nombre: z.string().min(1),
  costo: precioSchema,
});
export type ZonaEnvioMenu = z.infer<typeof zonaEnvioMenuSchema>;

/** Todo lo que necesita la página pública de un comercio: datos, menú, zonas y horarios. */
export const menuComercioSchema = comercioResumenSchema.extend({
  whatsapp: z.string().regex(/^549\d{10}$/),
  direccion: z.string().nullable(),
  pedidoMinimo: precioSchema,
  /** Solo las zonas activas. */
  zonasEnvio: z.array(zonaEnvioMenuSchema),
  /** Solo las categorías activas, ordenadas, con sus productos ordenados. */
  categorias: z.array(categoriaMenuSchema),
});
export type MenuComercio = z.infer<typeof menuComercioSchema>;
