# Arquitectura · Residencial Amena — Inventario

## Resumen

Aplicación **monolito modular** (vertical slices) sobre Astro 7 (SSR) + Drizzle ORM +
better-sqlite3. El código se organiza por **dominio de negocio** (features) sobre una
**infraestructura pura** (core), de modo que agregar una funcionalidad nueva equivale a
crear una carpeta, sin tocar el resto del sistema.

Stack:

- **Astro 7** — renderizado SSR con adapter `@astrojs/node` (modo standalone).
- **Drizzle ORM** + **better-sqlite3** — base de datos SQLite con migraciones.
- **zod** — validación y tipos en runtime, compartidos entre servidor y cliente.
- **TypeScript strict** — con alias de importación (`@core`, `@features`, `@shared`, ...).

## Esquema de carpetas

```
src/
├── pages/                         # RUTAS FINAS: páginas .astro + endpoints /api
│   │                              #   Solo delegan en features; sin lógica de negocio.
│   ├── index.astro                #   Mapa público
│   ├── admin/                     #   Dashboard, login, editor, plano, modelos
│   └── api/                       #   /api/auth/*, /api/admin/*
│
├── features/                      # NEGOCIO: una "vertical slice" por dominio.
│   │                              #   Regla: importan core y shared, nunca otras features.
│   ├── auth/
│   │   ├── auth.types.ts          #   Schema zod de login (compartido server/cliente)
│   │   ├── session.service.ts     #   Crear/validar/invalidar sesiones (cookie 30 días)
│   │   └── password.service.ts    #   Hash y verificación scrypt
│   ├── catalog/
│   │   ├── modelo.types.ts        #   Schema zod del formulario + ModeloConCaracteristicas
│   │   └── modelo.service.ts      #   CRUD de modelos (casas y apartamentos)
│   ├── lots/
│   │   ├── lote.types.ts          #   Schemas zod (create/update) + LoteConModelo
│   │   └── lote.service.ts        #   CRUD de lotes + polígonos
│   └── plan/
│       ├── plano.types.ts         #   Schema zod del plano base
│       └── plano.service.ts       #   Obtener/actualizar el plano activo
│
├── core/                          # INFRAESTRUCTURA PURA: reutilizable, sin negocio.
│   ├── db/
│   │   ├── client.ts              #   Singleton de better-sqlite3 + Drizzle
│   │   └── schema/                #   1 tabla por dominio (auth, planos, modelos, lotes)
│   ├── http/
│   │   ├── json.ts                #   Helpers json() y redirect()
│   │   ├── errors.ts              #   ApiError (status + código) + toErrorMessage
│   │   └── api.ts                 #   Wrappers jsonApi() y formApi() (auth + errores)
│   ├── geometry/                  #   Punto, validación de polígonos (futuro CAD)
│   ├── storage/                   #   Uploads: MIME permitido, límite 10MB, nombres únicos
│   └── validation/                #   parse() y formToObject() sobre schemas zod
│
├── shared/                        # UI REUTILIZABLE y núcleo de cliente.
│   ├── layouts/                   #   AdminLayout · PublicLayout
│   ├── components/                #   Sidebar · ModeloForm
│   └── map/                       #   Núcleo SVG compartido entre mapa público y editor
│       ├── viewport.ts            #     Zoom/pan sobre el viewBox
│       ├── svg-utils.ts           #     SVG_NS, escapeHtml
│       ├── lot-renderer.ts        #     Crear polígono y etiqueta de un lote
│       └── lot-colors.ts          #     Colores por estado (disponible/reservado/vendido)
│
├── scripts/                       # BUNDLES CLIENTE delgados (componen shared/map).
│   ├── public-map.ts              #   Mapa público (filtros, modales)
│   └── editor.ts                  #   Editor admin (dibujar/editar lotes)
│
├── middleware.ts                  # Autenticación de rutas /admin
├── styles/global.css              # Design tokens (fuente única de la paleta)
├── db/                            # COMPATIBILIDAD: client.ts y schema.ts re-exportan
│   │                              #   desde core/db (no romper imports históricos @db/*)
│   └── seed.ts                    # Datos iniciales (admin + modelos)
└── env.d.ts                       # Tipos de Astro.locals (usuario autenticado)
```

## Reglas de dependencia (lo que evita romper nada)

1. **`features` importan `core` y `shared`** — nunca importan otras `features`
   directamente (si necesitan datos de otro dominio, consultan la tabla en `core/db/schema`).
2. **`core` no importa `features`** ni `shared` — es infraestructura reutilizable.
3. **`shared` no importa `core`** — solo UI y utilidades de cliente.
4. **`pages` es una capa fina** — no contiene lógica de negocio ni acceso a BD directo.
5. **`src/db/` es solo compatibilidad** — `client.ts` y `schema.ts` re-exportan desde
   `core/db` para no romper imports históricos (`@db/*`).

## Ciclo de una petición

```
POST /api/admin/lotes
        │
        ▼
pages/api/admin/lotes/index.ts        ← ruta fina (capa de transporte)
        │  jsonApi(handler)           ← wrapper: exige sesión + mapea errores
        ▼
core/http/api.ts                      ← 401 si no hay sesión
        ▼
handler → parse(body, loteCreateSchema)   ← validación zod (core/validation)
        ▼
features/lots/lote.service.ts        ← lógica de negocio + queries
        ▼
core/db/client.ts + core/db/schema   ← acceso a SQLite (Drizzle)
```

## Anatomía de una feature

```
features/<dominio>/
├── <dominio>.types.ts      schemas zod + tipos inferidos (compartidos server/cliente)
└── <dominio>.service.ts    funciones de negocio (get, create, update, delete, ...)
```

Los `*.types.ts` son los únicos archivos que el cliente importa (vía `import type` o los
propios schemas para reutilizar validación en formularios). Así el contrato es **único**:
el servidor y el navegador validan con el mismo schema y los mismos tipos.

## Cómo agregar una feature nueva

1. Crear `features/<dominio>/<dominio>.types.ts` con los schemas zod.
2. Crear `features/<dominio>/<dominio>.service.ts` con las queries.
3. Crear la(s) ruta(s) en `src/pages/...` delegando en el servicio.
4. Si hace falta una tabla: agregar `core/db/schema/<tabla>.ts` + migración (`pnpm db:generate`).
5. Registrar el ítem de navegación en `shared/components/admin/Sidebar.astro` (si es admin).

Nada más cambia: el resto del sistema no depende de la feature nueva.

## Comandos útiles

| Comando | Uso |
|--------|-----|
| `pnpm dev` | servidor de desarrollo |
| `pnpm check` | verificación de tipos (obligatorio antes de terminar cambios) |
| `pnpm build` | build de producción |
| `pnpm db:generate` / `db:migrate` / `db:push` | migraciones Drizzle |
| `pnpm db:seed` | datos iniciales (admin + modelos) |

> Para despliegue (dev / preview / producción Hostinger) ver `AGENTS.md`.