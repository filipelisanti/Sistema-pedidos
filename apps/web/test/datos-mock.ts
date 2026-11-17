import type { Horario, MenuComercio } from '@pedidos/shared';

/**
 * Datos de prueba para los tests de la web: espejan el seed de la API (mismos comercios, productos e IDs
 * en el orden en que los inserta el seed). Los sirve la API falsa de test/api-falsa.ts.
 * Solo incluye comercios ACTIVOS: los PENDIENTE/SUSPENDIDO nunca llegan al front público.
 */

/** Todos los días, mediodía y noche (viernes y sábado la noche cruza la medianoche). */
const horarioTipico: Horario[] = Array.from({ length: 7 }, (_, dia) => [
  { diaSemana: dia, abre: '11:30', cierra: '15:00' },
  { diaSemana: dia, abre: '19:30', cierra: dia === 5 || dia === 6 ? '01:00' : '23:30' },
]).flat();

const producto = (
  id: number,
  nombre: string,
  precio: number,
  extra: Partial<MenuComercio['categorias'][number]['productos'][number]> = {},
) => ({
  id,
  nombre,
  precio,
  descripcion: null,
  imagenUrl: null,
  disponible: true,
  variantes: [],
  ...extra,
});

export const MENUS_MOCK: MenuComercio[] = [
  {
    id: 1,
    nombre: 'Pizzería Don Luis',
    slug: 'pizzeria-don-luis',
    rubro: 'Pizzería',
    localidad: 'Lomas de Zamora',
    logoUrl: null,
    aceptaEnvio: true,
    aceptaRetiro: true,
    horarios: horarioTipico,
    whatsapp: '5491112345678',
    direccion: 'Av. Hipólito Yrigoyen 9000',
    pedidoMinimo: 8000,
    zonasEnvio: [
      { id: 1, nombre: 'Centro (hasta 10 cuadras)', costo: 1500 },
      { id: 2, nombre: 'Banfield / Temperley', costo: 2500 },
    ],
    categorias: [
      {
        id: 1,
        nombre: 'Pizzas',
        productos: [
          producto(1, 'Muzzarella', 12000, {
            descripcion: 'Salsa de tomate, muzzarella y aceitunas',
            variantes: [
              { id: 1, nombre: 'Grande', precio: 12000 },
              { id: 2, nombre: 'Chica', precio: 9000 },
            ],
          }),
          producto(2, 'Napolitana', 14000, {
            descripcion: 'Muzzarella, tomate en rodajas, ajo y perejil',
            variantes: [
              { id: 3, nombre: 'Grande', precio: 14000 },
              { id: 4, nombre: 'Chica', precio: 10500 },
            ],
          }),
          producto(3, 'Fugazzeta rellena', 16500),
        ],
      },
      {
        id: 2,
        nombre: 'Empanadas',
        productos: [
          producto(4, 'Carne cortada a cuchillo', 1500, {
            variantes: [
              { id: 5, nombre: 'Unidad', precio: 1500 },
              { id: 6, nombre: 'Media docena', precio: 8000 },
              { id: 7, nombre: 'Docena', precio: 15000 },
            ],
          }),
          producto(5, 'Jamón y queso', 1400),
          producto(6, 'Humita', 1400, { disponible: false }),
        ],
      },
      {
        id: 3,
        nombre: 'Bebidas',
        productos: [producto(7, 'Gaseosa 1.5 L', 3500), producto(8, 'Cerveza 1 L', 4500)],
      },
    ],
  },
  {
    id: 2,
    nombre: 'Empanadas La Tucumana',
    slug: 'empanadas-la-tucumana',
    rubro: 'Empanadas',
    localidad: 'Banfield',
    logoUrl: null,
    aceptaEnvio: false,
    aceptaRetiro: true,
    horarios: horarioTipico,
    whatsapp: '5491187654321',
    direccion: null,
    pedidoMinimo: 0,
    zonasEnvio: [],
    categorias: [
      {
        id: 4,
        nombre: 'Empanadas',
        productos: [
          producto(9, 'Tucumana de carne', 1600),
          producto(10, 'Pollo', 1500),
          producto(11, 'Verdura', 1400),
        ],
      },
    ],
  },
];
