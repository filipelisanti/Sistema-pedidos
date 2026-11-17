# Pedidos por WhatsApp

Plataforma web **multi-comercio** (pizzerías, empanadas, etc.) donde el cliente busca un comercio, arma su pedido desde el celular y lo envía por WhatsApp con todo el detalle. Sin pagos online y sin cuenta para el cliente.

## Stack

| Capa          | Tecnología                                                       |
| ------------- | ---------------------------------------------------------------- |
| Monorepo      | pnpm workspaces                                                  |
| Frontend      | React 19 + TypeScript + Vite + Tailwind CSS 4 (mobile-first)     |
| Backend       | NestJS 11 + TypeScript                                           |
| Base de datos | PostgreSQL 16 + Drizzle ORM (migraciones SQL versionadas)        |
| Compartido    | `@pedidos/shared`: schemas Zod, carrito, mensaje, horarios       |
| Tests         | Vitest (shared/web), Jest + Supertest contra Postgres real (api) |
| CI            | GitHub Actions                                                   |

## Estructura

```
apps/
  api/        NestJS: API REST, esquema de la base, migraciones y seed
    src/db/   schema.ts (modelo de datos), client.ts, seed.ts
    drizzle/  migraciones SQL generadas (se commitean)
    test/     tests de integración contra Postgres
  web/        React: la app que usa el cliente desde el celular
packages/
  shared/     Lógica de negocio pura usada por web y api (con sus tests)
docker/       Script que crea la base de test
```

## Requisitos

- Node.js 22+
- pnpm 10 (`corepack enable` lo instala)
- Docker (para PostgreSQL)

## Puesta en marcha

```bash
pnpm install
cp apps/api/.env.example apps/api/.env

pnpm db:up          # levanta Postgres en Docker (crea las bases pedidos y pedidos_test)
pnpm build:shared   # compila @pedidos/shared (lo usan api y web)
pnpm db:migrate     # aplica las migraciones
pnpm db:seed        # carga datos de prueba

pnpm dev:api        # http://localhost:3000/api/health
pnpm dev:web        # http://localhost:5173 (y desde el celular: http://<ip-de-tu-pc>:5173)
```

Si modificás `packages/shared` con la API o la web corriendo, dejá en otra terminal `pnpm --filter @pedidos/shared dev` para que se recompile solo.

### Datos de prueba (seed)

| Usuario               | Rol            | Clave                                    |
| --------------------- | -------------- | ---------------------------------------- |
| `admin@pedidos.local` | SUPERADMIN     | la de `SEED_SUPERADMIN_PASSWORD` en .env |
| `donluis@demo.local`  | COMERCIO_ADMIN | `demo1234`                               |
| `tucumana@demo.local` | COMERCIO_ADMIN | `demo1234`                               |

Comercios: **Pizzería Don Luis** (ACTIVO, con envío y menú completo), **Empanadas La Tucumana** (ACTIVO, solo retiro) y **Burger Norte** (PENDIENTE: no debe aparecer en el buscador).

## Scripts útiles

| Comando            | Qué hace                                                       |
| ------------------ | -------------------------------------------------------------- |
| `pnpm test`        | Todos los tests (los de la api usan la base `pedidos_test`)    |
| `pnpm typecheck`   | Chequeo de tipos en todo el monorepo                           |
| `pnpm lint`        | ESLint                                                         |
| `pnpm format`      | Prettier                                                       |
| `pnpm db:generate` | Genera una migración SQL después de cambiar `src/db/schema.ts` |
| `pnpm db:studio`   | Drizzle Studio: ver y editar la base desde el navegador        |

## Reglas de negocio importantes

- **Precios en pesos enteros** (integer), nunca float.
- **WhatsApp normalizado**: `549` + código de área sin 0 + número sin 15 (13 dígitos). Lo valida `@pedidos/shared` y también un CHECK en la base.
- **Aislamiento entre comercios**: toda tabla del comercio tiene `comercio_id`. El admin de un comercio solo puede ver y modificar lo suyo; el `comercio_id` sale siempre del token, nunca del request.
- **Roles**: `SUPERADMIN` (sin comercio) y `COMERCIO_ADMIN` (con comercio). La base lo garantiza con un CHECK.
- **Estados del comercio**: `PENDIENTE` → (aprobación del superadmin) → `ACTIVO` ↔ `SUSPENDIDO`. Solo los `ACTIVO` son públicos.
- **Horarios**: si `cierra <= abre`, la franja cruza la medianoche (ej. viernes 20:00 a 01:00).

## Flujo de trabajo (Git)

- `main`: producción · `develop`: integración · `feature/<nombre>`: cada tarea.
- PR a `develop` con la CI en verde. Commits chicos y descriptivos.

## Roadmap

- [x] **Sprint 0**: monorepo, modelo de datos, migraciones, seed, lógica compartida con tests, CI
- [x] **Sprint 1**: front público con datos mock: menú, carrito, checkout y envío por WhatsApp
- [ ] **Sprint 2**: API pública: buscador de comercios y menú por slug
- [ ] **Sprint 3**: login y panel del comercio (ABM de productos, horarios, zonas de envío)
- [ ] **Sprint 4**: panel superadmin y solicitud de alta de comercios
- [ ] **Sprint 5**: "abierto ahora", imágenes, PWA, Lighthouse y deploy
