import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { ComercioResumen, MenuComercio } from '@pedidos/shared';
import { ComerciosService } from './comercios.service';

/** Endpoints públicos: los usa el cliente desde el celular, sin login. */
@Controller('comercios')
export class ComerciosController {
  constructor(private readonly comercios: ComerciosService) {}

  /** GET /api/comercios — comercios activos para el buscador. */
  @Get()
  listar(): Promise<ComercioResumen[]> {
    return this.comercios.listarActivos();
  }

  /** GET /api/comercios/:slug/menu — todo lo necesario para armar un pedido. */
  @Get(':slug/menu')
  async menu(@Param('slug') slug: string): Promise<MenuComercio> {
    const menu = await this.comercios.menuPorSlug(slug);
    if (!menu) throw new NotFoundException('Comercio no encontrado');
    return menu;
  }
}
