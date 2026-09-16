# Despliegue

## Stack

- **Astro SSR en Vercel** (`@astrojs/vercel`, `output: "server"`).
- **PostgreSQL en Supabase** con el pooler (Supavisor, modo Transaction).
- **Cloudflare R2** para la imagen del plano y las fotos de los lotes (egress $0).
- **Drizzle ORM** con dialecto `postgresql`.

## Entornos

### Desarrollo

Astro carga `.env` automáticamente.

```bash
pnpm dev
```

### Preview local

```bash
pnpm build
pnpm preview
```

Requiere `DATABASE_URL` y, si se suben imágenes, las variables `R2_*`.

### Producción

Vercel (build y runtime). No hay servidor propio ni filesystem persistente.

## Variables de entorno

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Connection string de Supabase. Usa el **pooler** (puerto `6543`), no la conexión directa. |
| `SESSION_SECRET` | Secreto de sesión. |
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare. |
| `R2_ACCESS_KEY_ID` | Access key del token de R2. |
| `R2_SECRET_ACCESS_KEY` | Secret del token de R2. |
| `R2_BUCKET` | Nombre del bucket. |
| `R2_PUBLIC_BASE_URL` | Dominio público del bucket (custom domain). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo para ejecutar el seed. |

Cópialas desde `.env.template`. En Vercel se configuran en **Project → Settings → Environment Variables**.

## Base de datos (Supabase)

Generar migraciones durante el desarrollo:

```bash
pnpm db:generate
```

Aplicar migraciones:

```bash
pnpm db:migrate
```

Seed inicial (una sola vez):

```bash
pnpm db:seed
```

- No usar `db:push` como procedimiento normal de producción.
- El **build de Vercel no aplica migraciones ni seed**: `pnpm build` es solo `astro build`.

## Almacenamiento (Cloudflare R2)

1. Crea un bucket y un **token de API** con permiso de lectura/escritura.
2. Conecta un **custom domain** al bucket (no uses `r2.dev`, que es solo para pruebas).
3. Usa ese dominio en `R2_PUBLIC_BASE_URL`.
4. Los archivos se sirven directo desde R2; solo se guarda la URL en Postgres.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Framework: **Astro** (autodetectado).
3. Install command: `pnpm install`. Build command: `pnpm build`.
4. Configura las variables de entorno (producción y preview).
5. Deploy.
6. Aplica migraciones y seed **manualmente** (por SSH local con el `DATABASE_URL` de producción, o desde tu máquina):

```bash
DATABASE_URL="<url-de-produccion>" pnpm db:migrate
DATABASE_URL="<url-de-produccion>" ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:seed
```

## Datos persistentes

- Base de datos PostgreSQL (gestionada por Supabase).
- Objetos en Cloudflare R2.

Ambos necesitan backup independiente del código.

## Backup y restauración

- **Supabase**: backups automáticos del plan; exporta con `pg_dump` para copia puntual.
- **R2**: sincroniza el bucket con `rclone` u otra herramienta S3-compatible.
- Prueba la restauración en un proyecto/DB separado antes de necesitarla.

## Comprobaciones posteriores al despliegue

- La web pública responde.
- El mapa carga su imagen desde R2.
- Los lotes aparecen correctamente.
- El login administrativo funciona.
- Las rutas `/admin` están protegidas.
- Se puede crear o actualizar un lote.
- La documentación de `/admin/documentacion` abre (los `.md` van empaquetados en la función).
