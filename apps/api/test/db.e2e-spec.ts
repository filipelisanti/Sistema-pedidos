/**
 * Tests de integración del modelo de datos contra un Postgres real.
 * Verifican que las reglas importantes estén garantizadas por la BASE, no solo por el código.
 */
import { and, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import { crearDb, type Db } from '../src/db/client';
import * as s from '../src/db/schema';
import { seed } from '../src/db/seed';

let db: Db;
let pool: Pool;

beforeAll(async () => {
  ({ db, pool } = crearDb());
  await seed(db);
});

afterAll(async () => {
  await pool.end();
});

/** Postgres devuelve el error real en `cause` (Drizzle lo envuelve). */
async function errorDePostgres(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
  } catch (e) {
    const err = e as { cause?: { constraint?: string; code?: string }; constraint?: string };
    return err.cause?.constraint ?? err.constraint ?? err.cause?.code ?? 'error-sin-codigo';
  }
  throw new Error('Se esperaba que la operación fallara');
}

describe('seed', () => {
  it('carga 2 comercios ACTIVOS y 1 PENDIENTE', async () => {
    const activos = await db.select().from(s.comercios).where(eq(s.comercios.estado, 'ACTIVO'));
    const pendientes = await db
      .select()
      .from(s.comercios)
      .where(eq(s.comercios.estado, 'PENDIENTE'));
    expect(activos.map((c) => c.slug).sort()).toEqual([
      'empanadas-la-tucumana',
      'pizzeria-don-luis',
    ]);
    expect(pendientes).toHaveLength(1);
  });

  it('carga el menú con categorías, productos y variantes', async () => {
    const comercio = await db.query.comercios.findFirst({
      where: eq(s.comercios.slug, 'pizzeria-don-luis'),
      with: { categorias: { with: { productos: { with: { variantes: true } } } } },
    });
    const pizzas = comercio?.categorias.find((c) => c.nombre === 'Pizzas');
    const muzza = pizzas?.productos.find((p) => p.nombre === 'Muzzarella');
    expect(muzza?.variantes.map((v) => v.nombre)).toEqual(['Grande', 'Chica']);
  });
});

describe('restricciones de la base', () => {
  it('un COMERCIO_ADMIN sin comercio es rechazado', async () => {
    const error = await errorDePostgres(
      db.insert(s.usuarios).values({ email: 'x@x.com', passwordHash: 'h', rol: 'COMERCIO_ADMIN' }),
    );
    expect(error).toBe('usuarios_rol_comercio');
  });

  it('un SUPERADMIN asociado a un comercio es rechazado', async () => {
    const error = await errorDePostgres(
      db
        .insert(s.usuarios)
        .values({ email: 'y@x.com', passwordHash: 'h', rol: 'SUPERADMIN', comercioId: 1 }),
    );
    expect(error).toBe('usuarios_rol_comercio');
  });

  it('el email de usuario es único', async () => {
    const error = await errorDePostgres(
      db.insert(s.usuarios).values({
        email: 'donluis@demo.local',
        passwordHash: 'h',
        rol: 'COMERCIO_ADMIN',
        comercioId: 1,
      }),
    );
    expect(error).toBe('usuarios_email_unique');
  });

  it('rechaza un WhatsApp mal formateado', async () => {
    const error = await errorDePostgres(
      db
        .update(s.comercios)
        .set({ whatsapp: '01115123456' })
        .where(eq(s.comercios.slug, 'pizzeria-don-luis')),
    );
    expect(error).toBe('comercios_whatsapp_formato');
  });

  it('un comercio debe aceptar envío o retiro (al menos uno)', async () => {
    const error = await errorDePostgres(
      db
        .update(s.comercios)
        .set({ aceptaEnvio: false, aceptaRetiro: false })
        .where(eq(s.comercios.slug, 'pizzeria-don-luis')),
    );
    expect(error).toBe('comercios_alguna_entrega');
  });

  it('rechaza horarios inválidos y precios negativos', async () => {
    expect(
      await errorDePostgres(
        db
          .insert(s.horarios)
          .values({ comercioId: 1, diaSemana: 7, abre: '10:00', cierra: '12:00' }),
      ),
    ).toBe('horarios_dia_valido');
    expect(
      await errorDePostgres(
        db
          .insert(s.horarios)
          .values({ comercioId: 1, diaSemana: 1, abre: '25:00', cierra: '12:00' }),
      ),
    ).toBe('horarios_abre_formato');
    expect(
      await errorDePostgres(
        db.update(s.productos).set({ precio: -1 }).where(eq(s.productos.comercioId, 1)),
      ),
    ).toBe('productos_precio_positivo');
  });

  it('el slug es único', async () => {
    const error = await errorDePostgres(
      db.insert(s.comercios).values({
        nombre: 'Otra',
        slug: 'pizzeria-don-luis',
        rubroId: 1,
        whatsapp: '5491100000000',
        localidad: 'Lanús',
      }),
    );
    expect(error).toBe('comercios_slug_unique');
  });

  it('borrar un comercio borra en cascada sus productos y usuarios', async () => {
    const [tucumana] = await db
      .select()
      .from(s.comercios)
      .where(eq(s.comercios.slug, 'empanadas-la-tucumana'));
    await db.delete(s.comercios).where(eq(s.comercios.id, tucumana!.id));

    const productos = await db
      .select()
      .from(s.productos)
      .where(eq(s.productos.comercioId, tucumana!.id));
    const admins = await db
      .select()
      .from(s.usuarios)
      .where(and(eq(s.usuarios.comercioId, tucumana!.id)));
    expect(productos).toHaveLength(0);
    expect(admins).toHaveLength(0);
  });
});
