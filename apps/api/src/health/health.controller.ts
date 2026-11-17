import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { DB } from '../db/db.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** GET /api/health — verifica que la API está viva y que la base responde. */
  @Get()
  async check() {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { status: 'ok', db: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
