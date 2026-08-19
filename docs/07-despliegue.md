# Despliegue

## Entornos

### Desarrollo

Astro carga automáticamente las variables del `.env` local.

```bash
pnpm dev
```

### Preview local

La preview requiere que `SESSION_SECRET` esté disponible en el entorno del proceso.

```bash
pnpm build
SESSION_SECRET=<secret-de-prueba> pnpm preview
```

### Producción

El despliegue previsto utiliza Hostinger hPanel con soporte para Node.js y el adapter de Astro en modo standalone.

## Requisitos

- Node.js 20 o superior.
- pnpm.
- Soporte para compilar `better-sqlite3`.
- Directorio persistente para SQLite.
- Directorio persistente para `public/uploads`.

## Instalación

```bash
pnpm install
```

## Variables de entorno

### `DATABASE_URL`

Ruta de la base de datos SQLite. Por defecto es `sqlite.db`, pero en producción conviene usar una ruta persistente y conocida.

### `SESSION_SECRET`

Secreto de sesión requerido en preview y producción. Debe ser largo, aleatorio y diferente del utilizado en desarrollo.

### Variables futuras

- Credenciales iniciales del seed.
- Configuración del canal de contacto.
- Parámetros de rate limiting.

## Base de datos

Generar migraciones durante el desarrollo:

```bash
pnpm db:generate
```

Aplicar migraciones:

```bash
pnpm db:migrate
```

El seed inicial se ejecuta explícitamente y no debe ejecutarse automáticamente en cada arranque de producción:

```bash
pnpm db:seed
```

## Build

```bash
pnpm build
```

El archivo generado para iniciar la aplicación es:

```text
dist/server/entry.mjs
```

## Configuración en Hostinger

- Startup file: `dist/server/entry.mjs`.
- Node.js: versión 20 o superior.
- `SESSION_SECRET`: secreto nuevo de producción.
- `DATABASE_URL`: ruta persistente de producción.
- `sqlite.db` y `public/uploads` deben quedar fuera del ciclo normal de reemplazo del código.

## Datos persistentes

- Base de datos SQLite.
- Archivos de `public/uploads`.
- Archivos WAL de SQLite mientras la aplicación esté funcionando.

Estos datos necesitan backup independiente del código fuente.

## Proceso recomendado de despliegue

1. Hacer backup de la base de datos y uploads.
2. Subir el código.
3. Ejecutar `pnpm install`.
4. Ejecutar `pnpm db:migrate`.
5. Ejecutar `pnpm build`.
6. Configurar las variables de entorno.
7. Configurar `dist/server/entry.mjs` como startup file.
8. Iniciar o reiniciar la aplicación.
9. Revisar logs.
10. Probar login, mapa público y actualización de un lote.

## Backup y restauración

El backup debe incluir:

- SQLite de forma consistente.
- `public/uploads`.
- Lista de variables de entorno, sin publicar sus valores.

La restauración debe probarse periódicamente en una copia separada antes de necesitarla en producción.

## Comprobaciones posteriores al despliegue

- La web pública responde.
- El mapa carga su imagen.
- Los lotes aparecen correctamente.
- El login administrativo funciona.
- Las rutas administrativas están protegidas.
- Se puede crear o actualizar un lote.
- Los datos permanecen tras reiniciar la aplicación.
