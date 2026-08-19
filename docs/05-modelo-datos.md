# Modelo De Datos

## Base de datos

La aplicación utiliza SQLite con Drizzle ORM. El esquema fuente se encuentra en `src/core/db/schema` y las migraciones en `drizzle/`.

## Usuario (`users`)

Representa una cuenta que puede acceder al panel administrativo.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `id` | integer | Sí | Identificador autoincremental |
| `email` | text | Sí | Email único del usuario |
| `passwordHash` | text | Sí | Contraseña almacenada con scrypt |
| `role` | text | Sí | Rol actual, por defecto `admin` |
| `createdAt` | integer | Sí | Fecha de creación en milisegundos |

## Sesión (`sessions`)

Representa una sesión activa de un usuario.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `id` | text | Sí | Token de sesión |
| `userId` | integer | Sí | Usuario asociado |
| `expiresAt` | integer | Sí | Fecha de expiración |
| `createdAt` | integer | Sí | Fecha de creación |

La relación con `users` utiliza eliminación en cascada.

## Plano (`planos`)

Representa una imagen base del residencial.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `id` | integer | Sí | Identificador |
| `nombre` | text | Sí | Nombre visible del plano |
| `imagenPath` | text | Sí | Ruta pública de la imagen |
| `anchoPx` | integer | Sí | Ancho del sistema de coordenadas |
| `altoPx` | integer | Sí | Alto del sistema de coordenadas |
| `createdAt` | integer | Sí | Fecha de creación |

La aplicación obtiene el plano más reciente como plano activo.

## Modelo (`modelos`)

Representa una casa o apartamento del catálogo.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `id` | integer | Sí | Identificador |
| `nombre` | text | Sí | Nombre comercial |
| `tipo` | enum | Sí | `casa` o `apartamento` |
| `precioBase` | real | Sí | Precio base |
| `terrenoM2` | real | Sí | Área del terreno |
| `construccionM2` | real | Sí | Área construida |
| `habitaciones` | integer | Sí | Número de habitaciones |
| `banos` | real | Sí | Número de baños |
| `parqueos` | integer | Sí | Número de parqueos |
| `dimensionesLote` | text | No | Dimensiones recomendadas |
| `caracteristicasJson` | text | No | Lista de características serializada como JSON |
| `orden` | integer | Sí | Orden de presentación |
| `createdAt` | integer | Sí | Fecha de creación |

## Lote (`lotes`)

Representa una parcela dibujada en el plano.

| Campo | Tipo | Requerido | Descripción |
|---|---|---:|---|
| `id` | integer | Sí | Identificador |
| `numeroLote` | text | Sí | Identificador visible del lote |
| `estado` | enum | Sí | `disponible`, `reservado` o `vendido` |
| `poligonoJson` | text | Sí | Lista de puntos serializada como JSON |
| `modeloId` | integer | No | Modelo asociado |
| `terrenoM2` | real | No | Área del terreno |
| `dimensionesLote` | text | No | Dimensiones visibles |
| `createdAt` | integer | Sí | Fecha de creación |
| `updatedAt` | integer | Sí | Fecha de última actualización |

## Relaciones

- Un usuario puede tener muchas sesiones.
- Un modelo puede estar asociado a muchos lotes.
- Un lote puede tener cero o un modelo.
- Si se elimina un modelo, `modeloId` del lote queda en `null`.
- Un plano se relaciona con los lotes conceptualmente mediante las coordenadas, no mediante una foreign key.

## Datos serializados

`caracteristicasJson` y `poligonoJson` permiten guardar listas dentro de SQLite. Son adecuados para el alcance actual, pero dificultan consultas SQL sobre elementos individuales.

## Restricciones pendientes

- `numeroLote` debería ser único.
- Los polígonos deberían validarse contra las dimensiones del plano.
- Debería garantizarse de forma más explícita la existencia de un único plano activo.
