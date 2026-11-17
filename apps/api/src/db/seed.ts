/**
 * Datos de prueba para desarrollo:
 *  - 1 superadmin
 *  - 3 comercios: 2 ACTIVOS (con menú completo y su admin) y 1 PENDIENTE
 *
 * Se puede correr varias veces: vacía las tablas y vuelve a cargar.
 * Uso: pnpm db:seed
 */
import 'dotenv/config';
import { normalizarNumeroWhatsapp, type Horario } from '@pedidos/shared';
import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { crearDb, type Db } from './client';
import * as s from './schema';

const CLAVE_ADMINS_DEMO = 'demo1234';

type MenuSeed = Array<{
  categoria: string;
  productos: Array<{
    nombre: string;
    descripcion?: string;
    precio: number;
    disponible?: boolean;
    variantes?: Array<{ nombre: string; precio: number }>;
  }>;
}>;

function wpp(numero: string): string {
  const n = normalizarNumeroWhatsapp(numero);
  if (!n) throw new Error(`Número inválido en el seed: ${numero}`);
  return n;
}

async function crearComercio(
  db: Db,
  params: {
    data: typeof s.comercios.$inferInsert;
    adminEmail?: string;
    horarios?: Horario[];
    zonas?: Array<{ nombre: string; costo: number }>;
    menu?: MenuSeed;
  },
) {
  const [comercio] = await db.insert(s.comercios).values(params.data).returning();
  if (!comercio) throw new Error('No se pudo crear el comercio');

  if (params.adminEmail) {
    await db.insert(s.usuarios).values({
      email: params.adminEmail,
      passwordHash: await argon2.hash(CLAVE_ADMINS_DEMO),
      rol: 'COMERCIO_ADMIN',
      comercioId: comercio.id,
    });
  }

  if (params.horarios?.length) {
    await db
      .insert(s.horarios)
      .values(params.horarios.map((h) => ({ ...h, comercioId: comercio.id })));
  }

  if (params.zonas?.length) {
    await db
      .insert(s.zonasEnvio)
      .values(params.zonas.map((z) => ({ ...z, comercioId: comercio.id })));
  }

  for (const [i, cat] of (params.menu ?? []).entries()) {
    const [categoria] = await db
      .insert(s.categorias)
      .values({ comercioId: comercio.id, nombre: cat.categoria, orden: i })
      .returning();

    for (const [j, p] of cat.productos.entries()) {
      const [producto] = await db
        .insert(s.productos)
        .values({
          comercioId: comercio.id,
          categoriaId: categoria!.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          disponible: p.disponible ?? true,
          orden: j,
        })
        .returning();

      if (p.variantes?.length) {
        await db
          .insert(s.variantes)
          .values(p.variantes.map((v, k) => ({ ...v, orden: k, productoId: producto!.id })));
      }
    }
  }
  return comercio;
}

/** Todos los días, mediodía y noche (viernes y sábado la noche cruza la medianoche). */
const horarioTipico: Horario[] = Array.from({ length: 7 }, (_, dia) => [
  { diaSemana: dia, abre: '11:30', cierra: '15:00' },
  { diaSemana: dia, abre: '19:30', cierra: dia === 5 || dia === 6 ? '01:00' : '23:30' },
]).flat();

export async function seed(db: Db) {
  // Vacía todo y reinicia los IDs. CASCADE borra también las tablas dependientes.
  await db.execute(
    sql`TRUNCATE TABLE pedidos, variantes, productos, categorias, zonas_envio, horarios, usuarios, comercios, rubros RESTART IDENTITY CASCADE`,
  );

  const rubros = await db
    .insert(s.rubros)
    .values(['Pizzería', 'Empanadas', 'Hamburguesas', 'Rotisería'].map((nombre) => ({ nombre })))
    .returning();
  const rubro = (nombre: string) => rubros.find((r) => r.nombre === nombre)!.id;

  await db.insert(s.usuarios).values({
    email: process.env.SEED_SUPERADMIN_EMAIL ?? 'admin@pedidos.local',
    passwordHash: await argon2.hash(process.env.SEED_SUPERADMIN_PASSWORD ?? 'cambiar-esta-clave'),
    rol: 'SUPERADMIN',
  });

  await crearComercio(db, {
    data: {
      nombre: 'Pizzería Don Luis',
      slug: 'pizzeria-don-luis',
      rubroId: rubro('Pizzería'),
      whatsapp: wpp('+54 9 11 1234-5678'),
      direccion: 'Av. Hipólito Yrigoyen 9000',
      localidad: 'Lomas de Zamora',
      estado: 'ACTIVO',
      pedidoMinimo: 8000,
    },
    adminEmail: 'donluis@demo.local',
    horarios: horarioTipico,
    zonas: [
      { nombre: 'Centro (hasta 10 cuadras)', costo: 1500 },
      { nombre: 'Banfield / Temperley', costo: 2500 },
    ],
    menu: [
      {
        categoria: 'Pizzas',
        productos: [
          {
            nombre: 'Muzzarella',
            descripcion: 'Salsa de tomate, muzzarella y aceitunas',
            precio: 12000,
            variantes: [
              { nombre: 'Grande', precio: 12000 },
              { nombre: 'Chica', precio: 9000 },
            ],
          },
          {
            nombre: 'Napolitana',
            descripcion: 'Muzzarella, tomate en rodajas, ajo y perejil',
            precio: 14000,
            variantes: [
              { nombre: 'Grande', precio: 14000 },
              { nombre: 'Chica', precio: 10500 },
            ],
          },
          { nombre: 'Fugazzeta rellena', precio: 16500 },
        ],
      },
      {
        categoria: 'Empanadas',
        productos: [
          {
            nombre: 'Carne cortada a cuchillo',
            precio: 1500,
            variantes: [
              { nombre: 'Unidad', precio: 1500 },
              { nombre: 'Media docena', precio: 8000 },
              { nombre: 'Docena', precio: 15000 },
            ],
          },
          { nombre: 'Jamón y queso', precio: 1400 },
          { nombre: 'Humita', precio: 1400, disponible: false },
        ],
      },
      {
        categoria: 'Bebidas',
        productos: [
          { nombre: 'Gaseosa 1.5 L', precio: 3500 },
          { nombre: 'Cerveza 1 L', precio: 4500 },
        ],
      },
    ],
  });

  await crearComercio(db, {
    data: {
      nombre: 'Empanadas La Tucumana',
      slug: 'empanadas-la-tucumana',
      rubroId: rubro('Empanadas'),
      whatsapp: wpp('5491187654321'),
      localidad: 'Banfield',
      estado: 'ACTIVO',
      aceptaEnvio: false, // solo retiro en el local
    },
    adminEmail: 'tucumana@demo.local',
    horarios: horarioTipico,
    menu: [
      {
        categoria: 'Empanadas',
        productos: [
          { nombre: 'Tucumana de carne', precio: 1600 },
          { nombre: 'Pollo', precio: 1500 },
          { nombre: 'Verdura', precio: 1400 },
        ],
      },
    ],
  });

  // Pidió el alta y todavía no fue aprobado: NO debe aparecer en el buscador.
  await crearComercio(db, {
    data: {
      nombre: 'Burger Norte',
      slug: 'burger-norte',
      rubroId: rubro('Hamburguesas'),
      whatsapp: wpp('5491100001111'),
      localidad: 'Lomas de Zamora',
      estado: 'PENDIENTE',
    },
  });
}

// Ejecutado directamente (pnpm db:seed), no cuando lo importa un test
if (require.main === module) {
  const { db, pool } = crearDb();
  seed(db)
    .then(async () => {
      const [{ count }] = (await db.execute(sql`SELECT count(*)::int AS count FROM productos`))
        .rows as Array<{ count: number }>;
      console.log(`Seed OK: 3 comercios, ${count} productos.`);
      console.log(
        `Admins demo: donluis@demo.local / tucumana@demo.local (clave: ${CLAVE_ADMINS_DEMO})`,
      );
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
