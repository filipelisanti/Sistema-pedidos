import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { crearDb } from './client';

/** Token de inyección. Uso: constructor(@Inject(DB) private readonly db: Db) {} */
export const DB = Symbol('DB');
const POOL = Symbol('POOL');

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => crearDb(config.getOrThrow('DATABASE_URL')),
    },
    {
      provide: DB,
      inject: [POOL],
      useFactory: ({ db }: ReturnType<typeof crearDb>) => db,
    },
  ],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly conexion: { pool: Pool }) {}

  async onApplicationShutdown() {
    await this.conexion.pool.end();
  }
}
