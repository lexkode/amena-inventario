# Vivienda en altura — sistema base

## Creación y capas del editor

**Nueva casa → Nuevo apartamento** es la primera opción del desplegable.
Primero permite dibujar el perímetro exterior del edificio, todavía sin overlay.
Al cerrar el polígono, se define la nomenclatura y numeración del edificio.
**Crear edificio** guarda esa entidad en la copia local del borrador y entra
en modo overlay para dibujar el primer apartamento.
Las casas, los puntos de interés y los demás edificios quedan bajo una capa
oscura y no pueden seleccionarse, moverse ni editarse. El edificio activo queda
encima de esa capa. **Salir del edificio** vuelve al plano general.

Dentro del edificio, el botón principal crea otro apartamento en ese mismo
edificio y planta. Para crear otro edificio, salir primero y elegir de nuevo
**Nuevo apartamento**. Se propone el siguiente identificador libre.
Seleccionar un apartamento desde la lista vuelve a su edificio y planta.
También se puede entrar pulsando el contorno del edificio en el plano general
o **Ver apartamentos** en la lista, incluso si aún no tiene apartamentos.

**Editar edificio** abre su formulario: nombre personalizado opcional, cantidad
de niveles (1–200) e imagen opcional **por nivel**. Cada imagen se elige desde
la biblioteca de R2 y se muestra bajo los apartamentos de esa planta, ajustada
al rectángulo envolvente y recortada al perímetro. Puede cambiarse o quitarse
sin afectar las imágenes de otras plantas. Sin nombre personalizado se conserva
la etiqueta de nomenclatura y numeración. Esta identidad permanece fija después
de crear el edificio; el nombre visible sí puede modificarse.

Al editar el edificio se pueden arrastrar sus vértices, moverlos con flechas,
agregar uno con doble clic en el contorno y quitar el seleccionado con Supr.
Cada nivel hereda el perímetro original del edificio, salvo que tenga un perímetro
personalizado. En **Editar edificio → Nivel: perímetro e imagen**, elegir un nivel
y **Dibujar nuevo perímetro**, **Editar vértices del nivel** o **Usar perímetro del edificio**.
Durante el dibujo y la edición, el perímetro original aparece al 30% de opacidad
como referencia. Se aplican las mismas herramientas de vértices que al edificio.
El perímetro personalizado puede diferir del original y debe contener todos los
apartamentos de ese nivel; no afecta a otros niveles. Guardar cambios incorpora
los perímetros al historial y al borrador; publicar los hace visibles en el front.
No se permite dejar apartamentos fuera ni reducir niveles ocupados. Reducir
niveles vacíos descarta sus imágenes y perímetros personalizados (no elimina archivos de R2).
La opacidad de estas imágenes se configura en **Marca → Vivienda en altura**;
el valor predeterminado es 50% y el rango permitido es 0–100%.
Cada casa o apartamento tiene además una **Planta arquitectónica** independiente,
editable antes de su galería. En el popup ocupa la primera posición y se muestra
completa (`contain`), mientras la apertura muestra la primera foto normal (segunda
posición si hay planta). Si solo existe la planta, se abre en ella. Este archivo
se conserva en publicaciones y respaldos; quitarlo no elimina el objeto de R2.
El contorno inactivo usa azul oscuro como las casas; el activo usa el acento.

**Eliminar edificio** pide confirmación e incluye todos sus apartamentos y
galerías. La operación es local hasta guardar borrador y puede deshacerse con
el historial. En la API, la confirmación explícita es obligatoria y se eliminan
apartamentos y edificio en una misma transacción. Los archivos de R2 no se
eliminan: pueden seguir referenciados por una publicación o respaldo.

Los apartamentos deben quedar completamente dentro del perímetro de su nivel. Pueden
tocar las paredes, pero ningún vértice ni lado puede salir de ese perímetro.
Se comprueba al dibujar, cerrar, arrastrar, mover vértices, usar flechas y pegar.
También se valida en la API para impedir que se guarde geometría fuera del
edificio. La comprobación contempla perímetros cóncavos, no solo sus vértices.
El perímetro debe tener área y no cruzarse a sí mismo.

## Datos y numeración

El formulario del edificio define su nomenclatura, tipo de identificador y
numeración. El del apartamento permite asignar un edificio ya creado y editar
la planta, el número de apartamento, el estado y un modelo de tipo apartamento.
Cambiar de edificio solo se admite si el apartamento cabe en su perímetro.
La galería aparece solo después de crear el apartamento, igual que en las casas.

El primer apartamento se propone en la planta 1. La combinación única es
**edificio + planta + número de apartamento**, independientemente del modelo.
Por ejemplo, Apartamento 1 en Planta 1 y Apartamento 1 en Planta 2 de Torre A
son válidos; dos apartamentos 1 en Planta 1 de Torre A no lo son.
Casas y apartamentos tienen espacios de numeración independientes.

**Marca → Grupos de Vivienda en altura** define los valores predeterminados:

- Edificio: Torre (por defecto), Edificio, Complejo o Condominio.
- Numeración: alfabética (por defecto) o numérica.
- Nivel: Planta (por defecto), Piso o Nivel.

Los valores quedan guardados en el edificio; cambiar Marca no renombra
edificios anteriores. Los edificios son entidades propias (`torres`) con un
polígono independiente del de sus apartamentos y pueden permanecer vacíos.
Cada apartamento referencia su edificio mediante `torreId`; la base impide
apartamentos sin edificio y el borrado directo de edificios ocupados; el servicio
de eliminación retira primero sus apartamentos dentro de la misma transacción.

El panel tiene tres secciones: **Vivienda unifamiliar**, **Vivienda en altura** y
**Puntos de interés**. Los apartamentos se agrupan por edificio y muestran
su planta. Las viviendas ajenas al edificio activo quedan deshabilitadas.

## Persistencia y compatibilidad

Los edificios y sus perímetros se conservan en borrador, historial, publicación
y respaldo JSON, incluso sin apartamentos. Los campos `tipoVivienda`, `grupo`,
`nivel` y `nombreNivel` acompañan al polígono de cada vivienda.
Pegar no permite introducir casas ni apartamentos de otro edificio en la
capa activa. Los snapshots anteriores a vivienda en altura se interpretan como
casas sin planta. Para apartamentos del sistema anterior sin perímetro de
edificio, la migración y la restauración crean un rectángulo envolvente de sus
polígonos para conservar los datos existentes.

Los respaldos/publicaciones nuevos usan `{ version: 2, lotes: [...], torres: [...] }`.
Se siguen aceptando los arrays de viviendas antiguos y el wrapper `{ lotes: [...] }`.
Se rechaza restaurar apartamentos fuera del perímetro antes de reemplazar el
borrador; los IDs de edificios se reasignan dentro de la transacción.

En el popup público, los apartamentos no muestran `lot-specs` (terreno y
dimensiones del lote). Conservan los datos de su modelo. Las casas mantienen
sus especificaciones de terreno.

En el plano público general se ven únicamente los contornos de los edificios,
no los apartamentos superpuestos. Pulsar un edificio muestra el overlay y su
primera planta, con su imagen opcional y sus apartamentos.
Al abrirlo, la vista pública ocupa toda la pantalla, centra el perímetro completo
con margen para los controles y fija el zoom y el desplazamiento (también en
móvil). El overlay oscurece toda la pantalla salvo el interior del edificio y
sus controles de niveles. Al salir se recupera la vista anterior del plano.
El encuadre deja 25vh arriba y 30vh abajo; desde el breakpoint de 1024px hacia
abajo, conserva 15vh a ambos lados, salvo en teléfonos (hasta 640px), donde usa
5% del ancho por lado para no reducir excesivamente el edificio. En móviles, la lista vertical de niveles se
centra horizontalmente en el espacio entre el edificio y su título. Los niveles
se muestran como texto en mayúsculas sin fondo; el título inferior tampoco tiene fondo. La X
superior derecha comparte los estilos de cierre del popup de las casas.
La entrada usa un zoom in y la salida un zoom out fluido, con las curvas
cúbicas de los popups (340ms; 260ms con movimiento reducido).
La navegación de
plantas permite consultar todos los niveles definidos, incluidos los vacíos.
La lista ordena los niveles de mayor a menor, con la planta más baja al final.
Al cambiar de nivel, el contenido actual sale con fade y desplazamiento vertical
antes de entrar el nuevo: al subir, sale hacia abajo y entra desde arriba;
al bajar, sale hacia arriba y entra desde abajo. Se desplazan juntos el perímetro
de la planta, su imagen y sus apartamentos; el recorte del overlay acompaña el
movimiento. El encuadre engloba todos los perímetros para evitar saltos entre
niveles, y los controles permanecen fijos. Con movimiento reducido se acorta el
desplazamiento (10px en vez de 28px), sin eliminarlo.
Salir del edificio (botón, Escape o clic fuera del perímetro) vuelve al plano
general. Se usan exclusivamente los edificios de la publicación vigente:
editar o borrar el borrador no altera el sitio público hasta publicar.

Migración: `0011_quick_doctor_doom.sql`. Añade campos de vivienda y Marca,
separa los índices únicos de casas y apartamentos y exige edificio/planta
para los apartamentos. `0012_clammy_banshee.sql` añade las entidades de edificios
y conserva los anteriores con un perímetro envolvente. `0013_romantic_doctor_faustus.sql`
añade la referencia de apartamento a edificio y su integridad referencial.
`0014_workable_dragon_lord.sql` añade nombre personalizado, cantidad de niveles
e imágenes por planta. La cantidad inicial respeta la planta más alta existente.
`0015_dashing_magus.sql` añade a Marca el ajuste de opacidad de las imágenes.
`0016_careless_hemingway.sql` añade la planta arquitectónica opcional por vivienda.
`0017_naive_drax.sql` añade los perímetros personalizados de cada nivel.
Aplicar las migraciones en cada entorno antes de desplegar:

```bash
pnpm db:migrate
```

No se ejecuta durante el build.

Pruebas unitarias:

```bash
pnpm exec tsx --test src/features/lots/grupo.test.ts src/features/lots/altura.test.ts src/features/lots/torre.test.ts src/features/lots/documento.test.ts src/core/geometry/perimeter.test.ts
```

Prueba opcional de restricciones reales en la base configurada en `.env`:

```bash
AMENA_DB_TESTS=1 pnpm exec tsx --env-file-if-exists=.env --test src/features/lots/altura.db.test.ts
```

Las inserciones de prueba se revierten mediante una transacción.

## Segunda etapa pendiente

La navegación básica de niveles a la izquierda del canvas ya está disponible.
**Agregar nivel**, la duplicación de una planta y las transiciones verticales
siguen pendientes de la segunda etapa. Por ahora la cantidad de niveles se
define en el formulario del edificio y los nuevos niveles comienzan vacíos.
