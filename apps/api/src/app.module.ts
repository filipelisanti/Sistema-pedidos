import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComerciosModule } from './comercios/comercios.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, HealthModule, ComerciosModule],
})
export class AppModule {}
