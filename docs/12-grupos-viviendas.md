# Grupos de Vivienda Unifamiliar

## Configuración

En **Marca → Grupos de Vivienda Unifamiliar** se seleccionan los valores
predeterminados para grupos nuevos:

- Nomenclatura: Polígono, Etapa, Sector, Fase, Cluster o nombre personalizado.
- Identificador: numérico (1, 2, 3…) o alfabético (A, B, C…, Ñ, AA…).

Cambiar estos valores no renombra grupos existentes ni modifica publicaciones.

## Asignación de viviendas

En el formulario de cada vivienda, **Grupo de viviendas** permite seleccionar
un grupo existente, dejarla sin grupo o crear/asignar otro grupo. Para un grupo
nuevo se indica la nomenclatura, el tipo de identificador y su valor; los valores
de Marca aparecen como predeterminados. Varias viviendas con los mismos tres
valores pertenecen al mismo grupo. Los grupos aparecen al asignarles viviendas;
no se mantienen grupos vacíos.

El panel muestra **Vivienda Unifamiliar → Grupo → Casa · Modelo**. Las viviendas
anteriores permanecen en **Sin grupo** hasta que se asignen explícitamente.
Una casa no puede repetir su número dentro del mismo grupo, aunque cambie el
modelo. Distintos grupos pueden tener la misma numeración. Sin grupo se conserva
la regla anterior de número único por modelo.

## Historial, borrador y publicación

La agrupación forma parte de los datos de cada vivienda, no de su geometría
(`poligono` sigue siendo el contorno dibujado en el plano). Asignarla o cambiarla
se aplica con **Guardar cambios**, admite deshacer/rehacer y copiar/pegar, y se
sincroniza con **Guardar borrador**. Solo llega al sitio público al publicar.

Las publicaciones y respaldos JSON de R2 incluyen el nombre, tipo y valor del
grupo. Restaurar recupera esos datos en el borrador sin depender de la Marca
actual y sin publicar automáticamente. Los archivos y publicaciones anteriores
que no contienen agrupación se restauran con `grupo: null`.

## Despliegue y pruebas

Antes de utilizar esta versión, aplicar las migraciones pendientes en cada base
de datos correspondiente:

```bash
pnpm db:migrate
```

Las migraciones `0009_grupos_viviendas.sql` y `0010_grupo_numero_unico.sql`
añaden los campos y un índice único para número de casa dentro de un grupo.
No se ejecutan desde el build.

Pruebas de validación y compatibilidad de snapshots:

```bash
pnpm exec tsx --test src/features/lots/grupo.test.ts
```
