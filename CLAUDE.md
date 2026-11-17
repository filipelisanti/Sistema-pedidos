# Contexto para Claude Code

Proyecto: plataforma multi-comercio para armar pedidos y enviarlos por WhatsApp. Ver README.md (stack, reglas de negocio y roadmap).

## Convenciones

- Código, nombres de dominio y comentarios en **español** (comercio, producto, pedido...). Términos técnicos estándar en inglés (service, controller, hook).
- TypeScript estricto. Nada de `any` salvo justificación.
- La lógica de negocio pura va en `packages/shared` con tests en Vitest. Web y API la importan desde `@pedidos/shared`; no duplicar lógica.
- Precios en pesos enteros (integer).
- Base de datos: el modelo está en `apps/api/src/db/schema.ts`. Después de cambiarlo, correr `pnpm db:generate` y commitear la migración generada en `apps/api/drizzle/`. Nunca editar a mano una migración ya aplicada.
- Seguridad multi-comercio: en endpoints del panel, el `comercioId` sale del usuario autenticado, nunca del body, query o params. Cada endpoint nuevo del panel lleva un test que verifica que el admin de otro comercio recibe 404.

## Antes de dar una tarea por terminada

```bash
pnpm build:shared && pnpm format && pnpm lint && pnpm typecheck && pnpm test
```

Los tests de la api necesitan Postgres corriendo (`pnpm db:up`) y usan `DATABASE_URL_TEST`.
