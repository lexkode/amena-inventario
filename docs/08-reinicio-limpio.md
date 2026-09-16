# Reinicio Limpio Del Proyecto

> **Nota:** este documento es un plan histórico escrito cuando el stack objetivo
> era Astro + Node en Hostinger + MySQL. El proyecto migró a **Vercel +
> Supabase (PostgreSQL) + Cloudflare R2**; para el estado y el despliegue
> vigentes, consulta `AGENTS.md` y `docs/07-despliegue.md`.

Este documento describe cómo reconstruir Residencial Amena Inventario de forma
incremental, manteniendo la arquitectura monolito modular, utilizando MySQL
desde el principio y validando el despliegue en Hostinger antes de desarrollar
todas las funcionalidades.

## Objetivo

Construir una aplicación Astro SSR que permita:

- Mostrar públicamente el plano de un residencial.
- Consultar la disponibilidad de los lotes.
- Filtrar lotes por estado y modelo.
- Gestionar modelos de vivienda desde un panel administrativo.
- Subir y actualizar el plano.
- Crear, editar y eliminar lotes mediante un editor visual.
- Mantener los datos en MySQL.

El objetivo inicial no incluye pagos, reservas online, CRM, múltiples
residenciales, aplicación móvil ni arquitectura distribuida.

## Principios Del Reinicio

1. La aplicación actual debe conservarse como referencia y respaldo.
2. La reconstrucción debe hacerse en otra rama o repositorio.
3. Cada etapa debe poder instalarse, compilarse y ejecutarse por separado.
4. El build de producción no debe depender de la base de datos.
5. Las migraciones y el seed deben ejecutarse como operaciones independientes.
6. No se utilizará SQLite ni como base principal ni como fallback silencioso.
7. No se subirán secretos, `node_modules`, `dist` ni datos persistentes a GitHub.
8. No se añadirá una capa de abstracción sin una necesidad concreta.
9. La aplicación se desplegará primero en Hostinger con una funcionalidad mínima.
10. No se continuará con la siguiente etapa hasta superar los criterios de aceptación.

## Arquitectura Objetivo

La aplicación conservará una arquitectura de monolito modular por dominios.

```text
src/
├── pages/                         # Páginas Astro y endpoints HTTP finos
│   ├── index.astro                # Mapa público
│   ├── admin/                     # Panel administrativo
│   └── api/                       # Endpoints de autenticación y administración
├── features/                      # Lógica de negocio por dominio
│   ├── auth/
│   ├── catalog/
│   ├── lots/
│   └── plan/
├── core/                          # Infraestructura reutilizable
│   ├── db/
│   │   ├── client.ts
│   │   └── schema/
│   ├── http/
│   ├── storage/
│   ├── validation/
│   └── geometry/
├── shared/                        # Componentes y utilidades visuales
│   ├── layouts/
│   ├── components/
│   └── map/
├── scripts/                       # Código cliente del mapa y editor
├── middleware.ts
└── styles/
```

### Reglas De Dependencias

1. `pages` recibe peticiones, valida lo básico y delega en servicios.
2. `features` contiene la lógica de negocio y las consultas de su dominio.
3. `features` puede importar `core` y `shared`.
4. Una feature no debe consultar directamente las tablas de otra feature.
5. `core` no debe importar features.
6. `shared` debe mantenerse independiente de la base de datos.
7. Los schemas Zod son el contrato de entrada y salida de cada feature.
8. El cliente nunca debe recibir secretos ni credenciales de base de datos.

## Etapa 0: Respaldar El Proyecto Actual

1. Crear un respaldo completo del código actual.
2. Respaldar la base de datos existente si contiene datos reales.
3. Respaldar todos los archivos de `public/uploads`.
4. Guardar una copia de las variables de entorno sin publicar sus valores.
5. No eliminar la aplicación actual hasta que la nueva versión esté operativa.
6. Documentar qué datos deben conservarse durante la migración.

Si todavía no existe una base MySQL con datos reales, es preferible comenzar
con una base MySQL vacía en vez de intentar reutilizar migraciones de SQLite.

## Etapa 1: Crear El Repositorio Limpio

1. Crear un repositorio nuevo en GitHub o una rama independiente.
2. Crear el proyecto Astro con TypeScript estricto.
3. Utilizar Astro SSR y el adapter `@astrojs/node`.
4. Utilizar el modo `standalone` del adapter.
5. Usar Node.js 24 en desarrollo y en Hostinger.
6. Fijar una versión comprobada de pnpm mediante `packageManager`.
7. Crear un archivo `.nvmrc` con la versión de Node utilizada.
8. Mantener un `pnpm-lock.yaml` generado por esa versión de pnpm.

La configuración de Node debe mantenerse dentro de la misma familia de versión
en todos los entornos. Una opción adecuada es Node 24, con un rango de engines
como `>=24 <25`.

### Dependencias Iniciales

Instalar únicamente lo necesario:

- `astro`.
- `@astrojs/node`.
- `zod`.
- `drizzle-orm`.
- `mysql2`.

Mantener como dependencias de desarrollo:

- `typescript`.
- `drizzle-kit`.
- `tsx`.
- `@astrojs/check`.

Añadir `ws` u otra dependencia solo si el código la importa directamente o si
una herramienta concreta la requiere.

### Scripts Iniciales

El `package.json` debe empezar con scripts simples:

```json
{
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "build": "astro build",
    "start": "node dist/server/entry.mjs"
  }
}
```

No incluir todavía migraciones, seed ni tareas de inicialización dentro de
`build`.

## Etapa 2: Crear La Aplicación Mínima

1. Crear una página pública que muestre un mensaje básico.
2. Crear una ruta `GET /api/health`.
3. Configurar `output: "server"`.
4. Configurar `@astrojs/node` en modo `standalone`.
5. Ejecutar localmente:

```bash
pnpm install
pnpm check
pnpm build
pnpm start
```

6. Confirmar que la aplicación responde en local.
7. Confirmar que existe `dist/server/entry.mjs`.

## Etapa 3: Validar Hostinger Antes De Añadir Funcionalidades

Esta es la etapa más importante. No desarrollar todo el sistema antes de
comprobar que el entorno de Hostinger puede instalar y ejecutar la aplicación.

1. Conectar el repositorio nuevo a GitHub.
2. Crear una aplicación Node.js en Hostinger, no una aplicación estática.
3. Seleccionar Node 24.
4. Configurar como raíz la carpeta que contiene `package.json`.
5. Seleccionar pnpm como package manager si Hostinger lo permite.
6. Configurar el comando de build como `pnpm run build`.
7. Configurar el comando de inicio como `pnpm start`.
8. Configurar el archivo de entrada como `dist/server/entry.mjs` si hPanel lo solicita.
9. Desplegar la aplicación mínima.
10. Comprobar la página pública y `/api/health`.

### Criterio De Bloqueo

Si el proyecto mínimo vuelve a fallar con:

```text
spawnSync .../esbuild/bin/esbuild EACCES
```

detener el desarrollo y contactar con Hostinger. Una aplicación Astro nueva
también utiliza herramientas que pueden depender de `esbuild`, por lo que
reiniciar el código no corregirá un filesystem del builder montado con
permisos incorrectos.

No utilizar `ignore-scripts=true` como solución final. Puede ocultar el error
durante la instalación y producir un fallo posterior cuando Astro intente
usar `esbuild` durante el build.

## Etapa 4: Variables De Entorno

Crear `.env.example` sin valores reales:

```text
DATABASE_URL=mysql://usuario:password@localhost:3306/amena_dev
SESSION_SECRET=secreto-largo-y-aleatorio
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=definir-solo-en-el-entorno
UPLOADS_DIR=/ruta/persistente/uploads
```

### Reglas

1. `.env` debe estar excluido de Git.
2. `DATABASE_URL` debe ser una variable privada del servidor.
3. No usar una URL MySQL predeterminada en producción.
4. No incluir contraseñas dentro del código fuente.
5. `SESSION_SECRET` solo debe existir si la aplicación realmente lo utiliza.
6. `UPLOADS_DIR` debe apuntar a una ubicación persistente.
7. Configurar las variables en Hostinger para build y runtime cuando corresponda.

Si las sesiones utilizan tokens aleatorios almacenados en MySQL, no es
obligatorio usar `SESSION_SECRET`. En ese caso se debe eliminar de la
configuración y documentación para no mantener una dependencia falsa.

## Etapa 5: Conectar MySQL Y Drizzle

1. Crear una base MySQL local.
2. Crear una base MySQL de producción en Hostinger o utilizar una externa.
3. Crear `src/core/db/client.ts` con un único pool MySQL.
4. Crear `drizzle.config.ts` con dialecto `mysql`.
5. Leer `DATABASE_URL` desde el entorno.
6. No usar SQLite como fallback.
7. Probar una consulta simple desde `/api/health`.

La estructura inicial del schema será:

```text
src/core/db/schema/
├── auth.ts
├── planos.ts
├── modelos.ts
└── lotes.ts
```

### Modelo MySQL Inicial

Crear estas tablas:

1. `users`: usuarios administrativos.
2. `sessions`: sesiones activas.
3. `planos`: planos cargados.
4. `modelos`: casas y apartamentos.
5. `lotes`: parcelas del residencial.

Aplicar estas reglas:

- `users.email` debe tener índice único.
- `lotes.numero_lote` debe tener índice único.
- `lotes.modelo_id` debe permitir `NULL`.
- Eliminar un modelo debe dejar `modelo_id` en `NULL`.
- Eliminar un usuario debe eliminar sus sesiones.
- `poligono` y `caracteristicas` pueden utilizar columnas JSON de MySQL.
- Las fechas deben utilizar un tipo consistente en todo el sistema.
- Los estados y tipos deben validarse en servidor con Zod.

### Migraciones

Una migración es un archivo SQL versionado que cambia la estructura de la
base de datos. El proceso será:

```bash
pnpm db:generate
pnpm db:migrate
```

`db:generate` crea una nueva migración a partir del schema de Drizzle.
`db:migrate` aplica las migraciones pendientes y registra cuáles ya fueron
ejecutadas.

El `package.json` debe mantener estos comandos separados:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

No utilizar `db:push` como procedimiento normal de producción. Puede utilizarse
localmente para prototipos, pero producción debe recibir migraciones revisables.

Si existen datos SQLite que deban conservarse, realizar una exportación y una
transformación explícita. No reutilizar automáticamente SQL generado para
SQLite en una base MySQL.

## Etapa 6: Seed Inicial

1. Crear `src/db/seed.ts` como comando independiente.
2. Leer `ADMIN_EMAIL` y `ADMIN_PASSWORD` desde variables de entorno.
3. Detener el seed si faltan esas variables.
4. Hacer el seed idempotente.
5. Crear el administrador solo si no existe.
6. Insertar modelos iniciales solo si la tabla está vacía.
7. Ejecutar el seed manualmente:

```bash
pnpm db:seed
```

8. Nunca ejecutar el seed automáticamente dentro de `pnpm build`.
9. Rotar cualquier contraseña que haya estado escrita en el repositorio.

## Etapa 7: Web Pública De Solo Lectura

Antes del panel administrativo, construir el flujo público:

1. Crear `features/catalog/modelo.types.ts`.
2. Crear `features/catalog/modelo.service.ts`.
3. Crear `features/lots/lote.types.ts`.
4. Crear `features/lots/lote.service.ts`.
5. Crear `features/plan/plano.types.ts`.
6. Crear `features/plan/plano.service.ts`.
7. Obtener el plano activo desde MySQL.
8. Obtener lotes y modelos desde MySQL.
9. Mostrar un estado vacío si todavía no existen datos.
10. Renderizar el mapa con los datos del servidor.

Después añadir, en este orden:

1. Colores por estado.
2. Números de lote.
3. Zoom.
4. Desplazamiento.
5. Filtro por estado.
6. Filtro por modelo.
7. Modal de detalle.

El visitante nunca debe recibir datos administrativos, hashes de contraseñas,
tokens de sesión ni URLs privadas.

## Etapa 8: Autenticación Administrativa

1. Crear el servicio de hash y verificación con scrypt.
2. Crear login y logout.
3. Crear sesiones persistidas en MySQL.
4. Crear la cookie `app_session_id`.
5. Configurar la cookie con `httpOnly`, `SameSite=lax` y `secure` en producción.
6. Crear middleware para proteger `/admin`.
7. Proteger cada endpoint administrativo en el servidor.
8. Devolver errores genéricos para credenciales inválidas.
9. Limpiar sesiones vencidas.
10. Añadir rate limiting al login antes de producción pública.

El middleware es una primera barrera, pero nunca debe ser la única validación.
Los endpoints deben rechazar por sí mismos las peticiones no autenticadas.

## Etapa 9: CRUD De Modelos

1. Definir el schema Zod del modelo.
2. Crear el servicio de lectura y escritura.
3. Crear endpoints para listar, crear, actualizar y eliminar.
4. Crear el listado administrativo.
5. Crear el formulario de alta.
6. Crear el formulario de edición.
7. Validar todos los campos en servidor.
8. Mantener las páginas Astro sin consultas directas a MySQL.
9. Probar que un modelo asociado a lotes se elimina de forma segura.

## Etapa 10: Gestión Del Plano

1. Crear el servicio para obtener el plano activo.
2. Crear el formulario administrativo.
3. Validar nombre, ancho y alto.
4. Limitar el tamaño máximo del archivo.
5. Validar el contenido real del archivo, no solo el MIME enviado por el navegador.
6. Rechazar SVG o sanitizarlo correctamente antes de permitirlo.
7. Guardar los archivos en una ubicación persistente.
8. Registrar la ruta y metadatos en MySQL.
9. Definir qué ocurre con los planos antiguos.
10. Confirmar que un nuevo despliegue no elimina los archivos existentes.

Para Hostinger, no asumir que `public/uploads` sobrevive automáticamente a un
nuevo ciclo de despliegue. Preferir un directorio persistente configurado por
`UPLOADS_DIR`. Si el directorio está fuera de la raíz pública, servir los
archivos mediante una ruta controlada del servidor.

## Etapa 11: CRUD De Lotes

1. Definir los estados permitidos: `disponible`, `reservado` y `vendido`.
2. Validar número, estado, modelo y datos opcionales.
3. Validar que el polígono tenga al menos tres puntos.
4. Validar que los puntos estén dentro de las dimensiones del plano.
5. Crear endpoints para listar, crear, actualizar y eliminar.
6. Crear una restricción única para el número de lote.
7. Mantener la relación opcional con el modelo.
8. Registrar `createdAt` y `updatedAt`.
9. Usar transacciones cuando una operación modifique varias tablas.
10. Rechazar campos desconocidos o no autorizados en la API.

## Etapa 12: Editor Visual

1. Mantener las utilidades SVG dentro de `shared/map`.
2. Mantener `editor.ts` como bundle cliente independiente.
3. Implementar primero el modo `Dibujar`.
4. Permitir cerrar un polígono con al menos tres puntos.
5. Enviar los datos al servidor solo después de validar localmente.
6. Actualizar la interfaz solo después de recibir una respuesta exitosa.
7. Implementar el modo `Editar`.
8. Permitir mover vértices sin perder la geometría completa.
9. Añadir confirmación antes de eliminar.
10. Mostrar errores de la API de forma visible.

El navegador puede mantener estado temporal, pero MySQL debe ser siempre la
fuente de verdad.

## Etapa 13: Pruebas Y Verificaciones

Antes de cada Pull Request ejecutar:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Verificar manualmente:

1. La web pública responde sin autenticación.
2. El login funciona con credenciales válidas.
3. Las credenciales inválidas no revelan información.
4. Las rutas `/admin` están protegidas.
5. Los endpoints administrativos rechazan peticiones sin sesión.
6. Los cambios de modelos aparecen en el mapa.
7. Los cambios de lotes sobreviven a un reinicio.
8. El plano cargado permanece después de un nuevo despliegue.
9. No existen secretos en el diff de Git.
10. Los backups se pueden restaurar en una base separada.

## Etapa 14: Sincronización Con GitHub

1. Utilizar `main` como rama desplegable.
2. Crear una rama por funcionalidad.
3. Abrir un Pull Request por funcionalidad completa.
4. Proteger `main` y exigir que pase el check del proyecto.
5. Configurar Hostinger para desplegar únicamente desde `main`.
6. No hacer pushes directos a `main` durante el desarrollo normal.
7. Crear etiquetas para versiones operativas.

Ejemplo de flujo:

```bash
git switch -c feature/mysql-foundation
git add .
git commit -m "feat: add mysql foundation"
git push -u origin feature/mysql-foundation
```

El commit y el push deben hacerse solo después de revisar el diff y comprobar
que no contiene `.env`, contraseñas, dumps ni archivos de uploads.

### Verificación Automática En GitHub

Configurar una acción que ejecute como mínimo:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

El build de CI no debe necesitar la base de datos de producción. Las pruebas
de integración con MySQL pueden añadirse después utilizando una base temporal.

## Etapa 15: Procedimiento De Despliegue En Hostinger

Para una versión ya validada:

1. Hacer backup de MySQL.
2. Hacer backup de la carpeta de uploads.
3. Fusionar la rama de funcionalidad en `main`.
4. Esperar a que GitHub Actions termine correctamente.
5. Iniciar el despliegue desde Hostinger.
6. Comprobar los logs de instalación y build.
7. Ejecutar migraciones pendientes por SSH si corresponde:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
```

8. Ejecutar el seed solo durante la instalación inicial:

```bash
pnpm db:seed
```

9. Reiniciar la aplicación.
10. Probar `/`, `/api/health`, login, mapa y una operación administrativa.

El comando de producción debe seguir siendo únicamente `pnpm run build` para
compilar y `pnpm start` para arrancar. No incorporar migraciones automáticas al
build solo para evitar un paso manual.

## Versionado

Utilizar Semantic Versioning con el formato `MAJOR.MINOR.PATCH`:

- `PATCH`: correcciones pequeñas sin añadir funcionalidades, por ejemplo `0.8.0` a `0.8.1`.
- `MINOR`: nueva funcionalidad compatible, por ejemplo `0.8.1` a `0.9.0`.
- `MAJOR`: cambio incompatible o rediseño importante, por ejemplo `0.9.0` a `1.0.0`.

Durante el MVP, la versión mayor permanecerá en `0` porque la API y el modelo
de datos todavía pueden cambiar.

## Orden Recomendado De Versiones

```text
0.1.0  Astro mínimo desplegado en Hostinger
0.2.0  MySQL conectado y health check
0.3.0  Schema, migraciones y seed manual
0.4.0  Mapa público de solo lectura
0.5.0  Login y logout
0.6.0  CRUD de modelos
0.7.0  Gestión y subida del plano
0.8.0  CRUD de lotes
0.9.0  Editor visual
1.0.0  Seguridad, backups y documentación final
```

## Criterio Para Considerar Terminada Una Feature

Una funcionalidad se considera terminada cuando:

1. Tiene schemas Zod y validación del servidor.
2. Tiene un servicio dentro de su feature.
3. Sus páginas y endpoints son finos.
4. Tiene migración si necesita cambios en MySQL.
5. Tiene manejo de errores.
6. Funciona localmente con MySQL.
7. Pasa `pnpm check`.
8. Pasa `pnpm build`.
9. Funciona en Hostinger.
10. No rompe las funcionalidades existentes.

## Problemas Que Deben Evitarse

- Volver a añadir SQLite para facilitar el desarrollo local.
- Ejecutar `drizzle-kit migrate` dentro de `build`.
- Ejecutar el seed en cada despliegue.
- Guardar contraseñas o secretos en el repositorio.
- Subir `node_modules` generado en otro sistema operativo.
- Eliminar manualmente versiones de `esbuild` del lockfile.
- Usar `db:push` como sustituto permanente de las migraciones.
- Confiar solo en el middleware para proteger APIs.
- Guardar uploads en una ubicación que Hostinger reemplace.
- Añadir Docker, Redis, colas o servicios externos antes de necesitarlos.
- Continuar desarrollando si el proyecto mínimo no puede desplegarse.

## Resultado Esperado

Al terminar este proceso, el proyecto tendrá una sola base de datos MySQL, un
build reproducible, migraciones controladas, un seed manual, una arquitectura
por features y un flujo claro:

```text
feature branch
→ Pull Request
→ check y build en GitHub
→ merge a main
→ despliegue en Hostinger
→ migración MySQL
→ reinicio de la aplicación
→ pruebas básicas
```

La decisión de pasar a un VPS debe tomarse únicamente si Hostinger no puede
ejecutar correctamente incluso la aplicación Astro mínima o si sus límites de
persistencia y operación dejan de ser adecuados para el proyecto.
