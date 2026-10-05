# Glosario Del Dominio

## Residencial

Proyecto inmobiliario que contiene un plano y un conjunto de viviendas comercializables. La implementación actual está orientada a Residencial Amena y no contempla todavía múltiples residenciales.

## Plano

Imagen base del residencial sobre la que se dibujan las casas. Se almacena una ruta pública, sus dimensiones en píxeles y un nombre. La aplicación trata el plano más reciente como el plano activo.

## Vivienda

Unidad residencial construida, ya sea casa o apartamento. Es el término general usado para el inventario y los modelos que incluyen ambos tipos.

## Casa

Vivienda unifamiliar del residencial. Tiene un número visible, un estado comercial, un contorno de coordenadas, un modelo opcional y datos de terreno y dimensiones.

## Número de casa

Identificador visible para usuarios y administradores, por ejemplo `12`. Es obligatorio y no puede repetirse dentro de un mismo grupo. Sin grupo se conserva la regla de número único por modelo.

## Polígono

Grupo de casas unifamiliares, cuya nomenclatura puede ser Polígono, Sector, Etapa, Fase, Cluster o personalizada, con identificador numérico o alfabético.

El contorno geométrico de una casa también se representa como un polígono: una lista de puntos `{ x, y }` en las coordenadas del plano, con al menos tres puntos. No debe confundirse con el grupo de casas.

## Punto

Coordenada bidimensional del plano:

```ts
{ x: number; y: number }
```

## Estado de la vivienda

- **Disponible:** puede ser ofrecido a un cliente.
- **Reservado:** tiene una reserva o proceso comercial en curso.
- **Vendido:** ya no está disponible para venta.

## Modelo

Tipo de vivienda asociado opcionalmente a una o varias unidades del inventario. Puede ser una casa o un apartamento e incluye precio, superficies, habitaciones, baños, parqueos y características.

## Tipo de modelo

- **Casa:** vivienda unifamiliar construida con terreno propio.
- **Apartamento:** unidad habitacional que puede no tener terreno propio.

## Características

Lista de textos descriptivos de un modelo, como `Jardín frontal`, `Walk-in closet` o `Garaje techado`. Se persiste internamente como JSON.

## Administrador

Usuario autenticado que puede acceder a `/admin` y ejecutar las operaciones administrativas actuales. El esquema tiene un campo `role`, aunque la autorización por roles todavía no está desarrollada.

## Sesión

Registro temporal asociado a un usuario y a una cookie `app_session_id`. Actualmente dura 24 horas.

## Plano activo

El plano más reciente registrado en la tabla `planos`. La web pública y el editor utilizan ese plano.
