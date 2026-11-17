/**
 * Modelo de datos de la plataforma multi-comercio (Drizzle ORM + PostgreSQL).
 *
 * Convenciones:
 *  - Tablas y columnas en snake_case en la base; propiedades en camelCase en TypeScript.
 *  - Precios en PESOS ENTEROS (integer): sin centavos y sin errores de redondeo de float.
 *  - Toda tabla "del comercio" tiene comercio_id directo, para filtrar siempre por él
 *    (regla de seguridad: un admin solo ve y toca datos de SU comercio).
 *
 * Después de modificar este archivo: `pnpm db:generate` crea la migración SQL.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const rolEnum = pgEnum('rol', ['SUPERADMIN', 'COMERCIO_ADMIN']);
export const estadoComercioEnum = pgEnum('estado_comercio', ['PENDIENTE', 'ACTIVO', 'SUSPENDIDO']);
export const tipoEntregaEnum = pgEnum('tipo_entrega', ['ENVIO', 'RETIRO']);

const id = () => integer('id').primaryKey().generatedAlwaysAsIdentity();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const HORA_HHMM = sql.raw(`'^([01][0-9]|2[0-3]):[0-5][0-9]$'`);

// ---------------------------------------------------------------------------

export const rubros = pgTable('rubros', {
  id: id(),
  nombre: varchar('nombre', { length: 60 }).notNull().unique(),
});

export const comercios = pgTable(
  'comercios',
  {
    id: id(),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    /** Se usa en la URL pública: /c/<slug> */
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    rubroId: integer('rubro_id')
      .notNull()
      .references(() => rubros.id),
    /** Normalizado: 549 + área sin 0 + número sin 15 (ver @pedidos/shared) */
    whatsapp: varchar('whatsapp', { length: 13 }).notNull(),
    direccion: varchar('direccion', { length: 150 }),
    localidad: varchar('localidad', { length: 80 }).notNull(),
    logoUrl: text('logo_url'),
    estado: estadoComercioEnum('estado').notNull().default('PENDIENTE'),
    aceptaEnvio: boolean('acepta_envio').notNull().default(true),
    aceptaRetiro: boolean('acepta_retiro').notNull().default(true),
    pedidoMinimo: integer('pedido_minimo').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('comercios_estado_localidad_idx').on(t.estado, t.localidad),
    index('comercios_rubro_idx').on(t.rubroId),
    check('comercios_whatsapp_formato', sql`${t.whatsapp} ~ '^549[0-9]{10}$'`),
    check('comercios_pedido_minimo_positivo', sql`${t.pedidoMinimo} >= 0`),
    check('comercios_alguna_entrega', sql`${t.aceptaEnvio} OR ${t.aceptaRetiro}`),
  ],
);

export const usuarios = pgTable(
  'usuarios',
  {
    id: id(),
    email: varchar('email', { length: 150 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    rol: rolEnum('rol').notNull(),
    /** Null para SUPERADMIN. Para COMERCIO_ADMIN: el único comercio que puede administrar. */
    comercioId: integer('comercio_id').references(() => comercios.id, { onDelete: 'cascade' }),
    activo: boolean('activo').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('usuarios_comercio_idx').on(t.comercioId),
    // La base garantiza la regla de roles, no solo el código
    check(
      'usuarios_rol_comercio',
      sql`(${t.rol} = 'SUPERADMIN' AND ${t.comercioId} IS NULL) OR (${t.rol} = 'COMERCIO_ADMIN' AND ${t.comercioId} IS NOT NULL)`,
    ),
  ],
);

export const horarios = pgTable(
  'horarios',
  {
    id: id(),
    comercioId: integer('comercio_id')
      .notNull()
      .references(() => comercios.id, { onDelete: 'cascade' }),
    /** 0 = domingo ... 6 = sábado */
    diaSemana: integer('dia_semana').notNull(),
    /** "HH:MM". Si cierra <= abre, la franja cruza la medianoche. */
    abre: varchar('abre', { length: 5 }).notNull(),
    cierra: varchar('cierra', { length: 5 }).notNull(),
  },
  (t) => [
    index('horarios_comercio_idx').on(t.comercioId),
    check('horarios_dia_valido', sql`${t.diaSemana} BETWEEN 0 AND 6`),
    check('horarios_abre_formato', sql`${t.abre} ~ ${HORA_HHMM}`),
    check('horarios_cierra_formato', sql`${t.cierra} ~ ${HORA_HHMM}`),
  ],
);

export const zonasEnvio = pgTable(
  'zonas_envio',
  {
    id: id(),
    comercioId: integer('comercio_id')
      .notNull()
      .references(() => comercios.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 80 }).notNull(),
    costo: integer('costo').notNull(),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    index('zonas_envio_comercio_idx').on(t.comercioId),
    check('zonas_envio_costo_positivo', sql`${t.costo} >= 0`),
  ],
);

export const categorias = pgTable(
  'categorias',
  {
    id: id(),
    comercioId: integer('comercio_id')
      .notNull()
      .references(() => comercios.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 80 }).notNull(),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [index('categorias_comercio_orden_idx').on(t.comercioId, t.orden)],
);

export const productos = pgTable(
  'productos',
  {
    id: id(),
    /** Redundante con categoria.comercio_id a propósito: simplifica el filtro de seguridad. */
    comercioId: integer('comercio_id')
      .notNull()
      .references(() => comercios.id, { onDelete: 'cascade' }),
    categoriaId: integer('categoria_id')
      .notNull()
      .references(() => categorias.id, { onDelete: 'cascade' }),
    nombre: varchar('nombre', { length: 100 }).notNull(),
    descripcion: varchar('descripcion', { length: 300 }),
    /** Precio base. Si el producto tiene variantes, se usa el precio de la variante. */
    precio: integer('precio').notNull(),
    imagenUrl: text('imagen_url'),
    /** false = "sin stock": se muestra pero no se puede pedir */
    disponible: boolean('disponible').notNull().default(true),
    orden: integer('orden').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('productos_comercio_idx').on(t.comercioId),
    index('productos_categoria_orden_idx').on(t.categoriaId, t.orden),
    check('productos_precio_positivo', sql`${t.precio} >= 0`),
  ],
);

export const variantes = pgTable(
  'variantes',
  {
    id: id(),
    productoId: integer('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'cascade' }),
    /** Ej: "Docena", "Media docena", "Grande", "Chica" */
    nombre: varchar('nombre', { length: 60 }).notNull(),
    precio: integer('precio').notNull(),
    orden: integer('orden').notNull().default(0),
  },
  (t) => [
    index('variantes_producto_idx').on(t.productoId),
    check('variantes_precio_positivo', sql`${t.precio} >= 0`),
  ],
);

/** Registro opcional de pedidos enviados, para estadísticas del comercio. */
export const pedidos = pgTable(
  'pedidos',
  {
    id: id(),
    comercioId: integer('comercio_id')
      .notNull()
      .references(() => comercios.id, { onDelete: 'cascade' }),
    tipoEntrega: tipoEntregaEnum('tipo_entrega').notNull(),
    total: integer('total').notNull(),
    /** Snapshot de los ítems al momento del pedido (los precios pueden cambiar después). */
    detalle: jsonb('detalle').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('pedidos_comercio_fecha_idx').on(t.comercioId, t.createdAt)],
);

// --- Relaciones (para las consultas con `db.query.*.findMany({ with: ... })`) ---

export const rubrosRelations = relations(rubros, ({ many }) => ({ comercios: many(comercios) }));

export const comerciosRelations = relations(comercios, ({ one, many }) => ({
  rubro: one(rubros, { fields: [comercios.rubroId], references: [rubros.id] }),
  usuarios: many(usuarios),
  horarios: many(horarios),
  zonasEnvio: many(zonasEnvio),
  categorias: many(categorias),
  productos: many(productos),
  pedidos: many(pedidos),
}));

export const usuariosRelations = relations(usuarios, ({ one }) => ({
  comercio: one(comercios, { fields: [usuarios.comercioId], references: [comercios.id] }),
}));

export const horariosRelations = relations(horarios, ({ one }) => ({
  comercio: one(comercios, { fields: [horarios.comercioId], references: [comercios.id] }),
}));

export const zonasEnvioRelations = relations(zonasEnvio, ({ one }) => ({
  comercio: one(comercios, { fields: [zonasEnvio.comercioId], references: [comercios.id] }),
}));

export const categoriasRelations = relations(categorias, ({ one, many }) => ({
  comercio: one(comercios, { fields: [categorias.comercioId], references: [comercios.id] }),
  productos: many(productos),
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
  comercio: one(comercios, { fields: [productos.comercioId], references: [comercios.id] }),
  categoria: one(categorias, { fields: [productos.categoriaId], references: [categorias.id] }),
  variantes: many(variantes),
}));

export const variantesRelations = relations(variantes, ({ one }) => ({
  producto: one(productos, { fields: [variantes.productoId], references: [productos.id] }),
}));

export const pedidosRelations = relations(pedidos, ({ one }) => ({
  comercio: one(comercios, { fields: [pedidos.comercioId], references: [comercios.id] }),
}));
