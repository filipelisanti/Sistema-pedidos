import { Module } from '@nestjs/common';
import { ComerciosController } from './comercios.controller';
import { ComerciosService } from './comercios.service';

@Module({ controllers: [ComerciosController], providers: [ComerciosService] })
export class ComerciosModule {}
