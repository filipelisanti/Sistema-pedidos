import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { comercioResumenSchema, menuComercioSchema } from '@pedidos/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { crearDb, type Db } from '../src/db/client';
import * as s from '../src/db/schema';
import { seed } from '../src/db/seed';
import type { Pool } from 'pg';

/**
 * API pública de comercios, contra Postgres real con los datos del seed.
 * Además de los datos, verifica el CONTRATO: las respuestas cumplen los schemas de @pedidos/shared
 * (los mismos con los que el front las valida).
 */
describe('API pública de comercios (e2e)', () => {
  let app: INestApplication;
  let db: Db;
  let pool: Pool;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ db, pool } = crearDb());
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  // Cada test arranca con los datos del seed (algunos tests los modifican)
  beforeEach(() => seed(db));

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  describe('GET /api/comercios', () => {
    it('lista solo los comercios ACTIVOS, ordenados por nombre', async () => {
      const res = await http().get('/api/comercios').expect(200);
      expect(res.body.map((c: { slug: string }) => c.slug)).toEqual([
        'empanadas-la-tucumana',
        'pizzeria-don-luis',
      ]);
    });

    it('cumple el contrato y no expone datos internos', async () => {
      const res = await http().get('/api/comercios').expect(200);
      for (const c of res.body) {
        expect(comercioResumenSchema.strict().safeParse(c).success).toBe(true);
      }
      expect(res.body[1]).toMatchObject({ rubro: 'Pizzería', localidad: 'Lomas de Zamora' });
      expect(res.body[1].horarios).toHaveLength(14);
    });

    it('no lista un comercio SUSPENDIDO', async () => {
      await db
        .update(s.comercios)
        .set({ estado: 'SUSPENDIDO' })
        .where(eq(s.comercios.slug, 'pizzeria-don-luis'));
      const res = await http().get('/api/comercios').expect(200);
      expect(res.body.map((c: { slug: string }) => c.slug)).toEqual(['empanadas-la-tucumana']);
    });
  });

  describe('GET /api/comercios/:slug/menu', () => {
    it('devuelve el menú completo y ordenado', async () => {
      const res = await http().get('/api/comercios/pizzeria-don-luis/menu').expect(200);
      const menu = menuComercioSchema.strict().parse(res.body);

      expect(menu).toMatchObject({
        nombre: 'Pizzería Don Luis',
        rubro: 'Pizzería',
        whatsapp: '5491112345678',
        pedidoMinimo: 8000,
        aceptaEnvio: true,
      });
      expect(menu.categorias.map((c) => c.nombre)).toEqual(['Pizzas', 'Empanadas', 'Bebidas']);
      const [pizzas, empanadas] = menu.categorias;
      expect(pizzas?.productos.map((p) => p.nombre)).toEqual([
        'Muzzarella',
        'Napolitana',
        'Fugazzeta rellena',
      ]);
      expect(pizzas?.productos[0]?.variantes).toEqual([
        { id: expect.any(Number), nombre: 'Grande', precio: 12000 },
        { id: expect.any(Number), nombre: 'Chica', precio: 9000 },
      ]);
      // Los productos sin stock se muestran (deshabilitados en el front)
      expect(empanadas?.productos.find((p) => p.nombre === 'Humita')?.disponible).toBe(false);
      expect(menu.zonasEnvio.map((z) => z.costo)).toEqual([1500, 2500]);
    });

    it('oculta categorías y zonas de envío inactivas', async () => {
      await db
        .update(s.categorias)
        .set({ activa: false })
        .where(eq(s.categorias.nombre, 'Bebidas'));
      await db
        .update(s.zonasEnvio)
        .set({ activa: false })
        .where(eq(s.zonasEnvio.nombre, 'Banfield / Temperley'));

      const res = await http().get('/api/comercios/pizzeria-don-luis/menu').expect(200);
      expect(res.body.categorias.map((c: { nombre: string }) => c.nombre)).toEqual([
        'Pizzas',
        'Empanadas',
      ]);
      expect(res.body.zonasEnvio).toHaveLength(1);
    });

    it('404 si el comercio no existe', async () => {
      await http().get('/api/comercios/no-existe/menu').expect(404);
    });

    it('404 si el comercio está PENDIENTE', async () => {
      await http().get('/api/comercios/burger-norte/menu').expect(404);
    });

    it('404 si el comercio está SUSPENDIDO', async () => {
      await db
        .update(s.comercios)
        .set({ estado: 'SUSPENDIDO' })
        .where(eq(s.comercios.slug, 'empanadas-la-tucumana'));
      await http().get('/api/comercios/empanadas-la-tucumana/menu').expect(404);
    });
  });
});
