# Arquitectura

## Resumen

La aplicación es un monolito modular con renderizado SSR. Una única aplicación contiene la web pública, el panel administrativo, las APIs, la lógica de negocio, la base de datos y el almacenamiento local de imágenes.

## Stack

- Astro 7.
- Adapter `@astrojs/node` en modo standalone.
- TypeScript estricto.
- Drizzle ORM.
- PostgreSQL (Supabase) con `postgres` (postgres.js).
- Zod para validación en tiempo de ejecución.
- TypeScript vanilla para el mapa y el editor.

## Capas

### `src/pages`

Capa de transporte. Contiene páginas Astro y endpoints API. Obtiene datos, valida entradas y delega en servicios.

### `src/features`

Lógica organizada por dominio:

- `auth`: contraseñas y sesiones.
- `catalog`: modelos de vivienda.
- `lots`: lotes, estados y polígonos.
- `plan`: plano activo.

### `src/core`

Infraestructura reutilizable:

- Cliente y esquemas de base de datos.
- Helpers HTTP.
- Validación.
- Geometría.
- Almacenamiento de archivos.

### `src/shared`

Layouts, componentes y utilidades visuales reutilizadas por las páginas y los scripts del mapa.

### `src/scripts`

Código ejecutado en el navegador:

- `public-map.ts`: mapa público, filtros y modales.
- `editor.ts`: dibujo, edición y persistencia de lotes.

## Flujo de una petición administrativa

```text
Petición HTTP
  -> página o endpoint en src/pages
  -> wrapper de autenticación en core/http
  -> schema Zod
  -> servicio de una feature
  -> Drizzle ORM
  -> PostgreSQL
  -> respuesta o redirección
```

## Flujo de la página pública

1. Astro obtiene el plano activo.
2. Astro obtiene lotes y modelos.
3. Astro genera el HTML inicial.
4. Los datos iniciales se entregan al navegador.
5. `public-map.ts` dibuja los polígonos SVG y gestiona la interacción.

## Persistencia

- PostgreSQL se accede mediante `DATABASE_URL` (pooler de Supabase en serverless).
- PostgreSQL aplica foreign keys y constraints; el almacenamiento es gestionado.
- Las imágenes se guardan en `public/uploads`.
- Las migraciones se guardan en `drizzle/`.

## Principios actuales

- Mantener las páginas finas.
- Centralizar la lógica de negocio en servicios.
- Validar entradas en el servidor.
- Compartir tipos entre servidor y cliente cuando sea útil.
- Evitar un framework frontend completo para la interacción del mapa.
- Mantener un despliegue sencillo de una sola aplicación.

## Dependencias actuales a revisar

- `lote.service.ts` depende de `catalog` para comprobar modelos.
- Algunos tipos compartidos importan tipos desde features.
- Existen reexports históricos en `src/db`.
- La documentación original describe una separación más estricta que la existente.

## Límites de la arquitectura

- Las consultas son asíncronas (postgres.js).
- La aplicación depende del filesystem local para uploads.
- La página pública carga todos los lotes y modelos iniciales.
- La arquitectura está pensada para una instancia y un volumen pequeño o moderado.
