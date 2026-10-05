# Producto

## Propósito

Residencial Amena Inventario es una web para mostrar la disponibilidad de viviendas de un residencial sobre un plano interactivo. También incluye un panel administrativo para mantener actualizados el plano, las casas y los modelos de vivienda.

## Usuarios

### Visitante público

- Consulta el plano del residencial.
- Filtra viviendas por estado y modelo.
- Consulta información de la vivienda y del modelo asociado.
- Puede iniciar una consulta comercial desde el detalle de la vivienda.

### Administrador

- Inicia sesión en el panel privado.
- Gestiona modelos de vivienda.
- Sube y actualiza el plano base.
- Crea, edita y elimina casas.
- Dibuja y modifica los contornos de las casas.
- Cambia el estado de cada casa.

## Objetivo principal

Permitir que un visitante encuentre una vivienda disponible y conozca sus características, mientras el equipo comercial puede actualizar la información sin modificar el código.

## Conceptos principales

- **Plano:** imagen base del residencial.
- **Vivienda:** unidad residencial construida; puede ser una casa o un apartamento.
- **Casa:** vivienda unifamiliar representada sobre el plano.
- **Modelo:** tipo de vivienda que puede asociarse a una unidad del inventario.
- **Estado:** disponibilidad comercial de la vivienda: disponible, reservado o vendido.

## Funcionalidades actuales

- Mapa público a pantalla completa.
- Filtros por estado y modelo.
- Zoom, desplazamiento y ajuste del mapa.
- Detalle visual de cada vivienda.
- Catálogo de modelos de casas y apartamentos.
- Login y logout administrativo.
- Editor visual de casas mediante polígonos SVG.
- Gestión del plano base.
- Persistencia en PostgreSQL (Supabase).
- Subida de imágenes del plano a Cloudflare R2.

## Funcionalidades previstas o incompletas

- Formulario de contacto real conectado a un canal comercial.
- Gestión de roles administrativos diferenciados.
- Historial de cambios de viviendas y modelos.
- Soporte para varios residenciales.
- Reservas online y pagos.
- Notificaciones comerciales.

## Fuera del alcance actual

- CRM completo.
- Gestión de contratos.
- Procesamiento de pagos.
- Portal de clientes autenticados.
- Aplicación móvil nativa.
- Arquitectura distribuida o multiinstancia.
