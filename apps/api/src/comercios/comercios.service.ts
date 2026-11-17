import { Inject, Injectable } from '@nestjs/common';
import type { ComercioResumen, MenuComercio } from '@pedidos/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { DB } from '../db/db.module';
import * as s from '../db/schema';

/** Columnas del comercio que se exponen en la API pública (nunca estado, fechas, etc.). */
const columnasResumen = {
  id: true,
  nombre: true,
  slug: true,
  localidad: true,
  logoUrl: true,
  aceptaEnvio: true,
  aceptaRetiro: true,
} as const;

const horariosOrdenados = {
  columns: { diaSemana: true, abre: true, cierra: true } as const,
  orderBy: [asc(s.horarios.diaSemana), asc(s.horarios.abre)],
};

/**
 * Consultas públicas (sin login): solo devuelven comercios ACTIVOS.
 * Las respuestas cumplen los contratos de @pedidos/shared (ver test/comercios.e2e-spec.ts).
 */
@Injectable()
export class ComerciosService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listarActivos(): Promise<ComercioResumen[]> {
    const filas = await this.db.query.comercios.findMany({
      columns: columnasResumen,
      where: eq(s.comercios.estado, 'ACTIVO'),
      orderBy: asc(s.comercios.nombre),
      with: { rubro: { columns: { nombre: true } }, horarios: horariosOrdenados },
    });
    return filas.map(({ rubro, ...c }) => ({ ...c, rubro: rubro.nombre }));
  }

  /** null si no existe o no está ACTIVO (para el público, un comercio suspendido no existe). */
  async menuPorSlug(slug: string): Promise<MenuComercio | null> {
    const c = await this.db.query.comercios.findFirst({
      columns: { ...columnasResumen, whatsapp: true, direccion: true, pedidoMinimo: true },
      where: and(eq(s.comercios.slug, slug), eq(s.comercios.estado, 'ACTIVO')),
      with: {
        rubro: { columns: { nombre: true } },
        horarios: horariosOrdenados,
        zonasEnvio: {
          columns: { id: true, nombre: true, costo: true },
          where: eq(s.zonasEnvio.activa, true),
          orderBy: [asc(s.zonasEnvio.costo), asc(s.zonasEnvio.id)],
        },
        categorias: {
          columns: { id: true, nombre: true },
          where: eq(s.categorias.activa, true),
          orderBy: [asc(s.categorias.orden), asc(s.categorias.id)],
          with: {
            productos: {
              columns: {
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                imagenUrl: true,
                disponible: true,
              },
              orderBy: [asc(s.productos.orden), asc(s.productos.id)],
              with: {
                variantes: {
                  columns: { id: true, nombre: true, precio: true },
                  orderBy: [asc(s.variantes.orden), asc(s.variantes.id)],
                },
              },
            },
          },
        },
      },
    });
    if (!c) return null;

    const { rubro, ...resto } = c;
    return { ...resto, rubro: rubro.nombre };
  }
}
