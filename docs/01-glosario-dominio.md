# Glosario Del Dominio

## Residencial

Proyecto inmobiliario que contiene un plano y un conjunto de lotes comercializables. La implementación actual está orientada a Residencial Amena y no contempla todavía múltiples residenciales.

## Plano

Imagen base del residencial sobre la que se dibujan los lotes. Se almacena una ruta pública, sus dimensiones en píxeles y un nombre. La aplicación trata el plano más reciente como el plano activo.

## Lote

Parcela individual del residencial. Tiene un número visible, un estado comercial, un polígono de coordenadas y datos opcionales de terreno y dimensiones.

## Número de lote

Identificador visible para usuarios y administradores, por ejemplo `A-01` o `12`. Actualmente es obligatorio, pero la base de datos todavía no impone unicidad.

## Polígono

Lista de puntos `{ x, y }` que representa la forma del lote dentro del sistema de coordenadas del plano. El editor exige al menos tres puntos.

## Punto

Coordenada bidimensional del plano:

```ts
{ x: number; y: number }
```

## Estado del lote

- **Disponible:** puede ser ofrecido a un cliente.
- **Reservado:** tiene una reserva o proceso comercial en curso.
- **Vendido:** ya no está disponible para venta.

## Modelo

Tipo de vivienda asociado opcionalmente a uno o varios lotes. Puede ser una casa o un apartamento e incluye precio, superficies, habitaciones, baños, parqueos y características.

## Tipo de modelo

- **Casa:** vivienda asociada normalmente a un lote de terreno.
- **Apartamento:** unidad habitacional que puede no tener terreno propio.

## Características

Lista de textos descriptivos de un modelo, como `Jardín frontal`, `Walk-in closet` o `Garaje techado`. Se persiste internamente como JSON.

## Administrador

Usuario autenticado que puede acceder a `/admin` y ejecutar las operaciones administrativas actuales. El esquema tiene un campo `role`, aunque la autorización por roles todavía no está desarrollada.

## Sesión

Registro temporal asociado a un usuario y a una cookie `app_session_id`. Actualmente dura 24 horas.

## Plano activo

El plano más reciente registrado en la tabla `planos`. La web pública y el editor utilizan ese plano.
