# Producto

## Propósito

Residencial Amena Inventario es una web para mostrar la disponibilidad de lotes de una lotificación residencial sobre un plano interactivo. También incluye un panel administrativo para mantener actualizados el plano, los lotes y los modelos de vivienda.

## Usuarios

### Visitante público

- Consulta el plano del residencial.
- Filtra lotes por estado y modelo.
- Consulta información del lote y del modelo asociado.
- Puede iniciar una consulta comercial desde el detalle del lote.

### Administrador

- Inicia sesión en el panel privado.
- Gestiona modelos de vivienda.
- Sube y actualiza el plano base.
- Crea, edita y elimina lotes.
- Dibuja y modifica los polígonos de los lotes.
- Cambia el estado de cada lote.

## Objetivo principal

Permitir que un visitante encuentre un lote disponible y conozca sus características, mientras el equipo comercial puede actualizar la información sin modificar el código.

## Conceptos principales

- **Plano:** imagen base del residencial.
- **Lote:** parcela dibujada sobre el plano.
- **Modelo:** tipo de casa o apartamento que puede asociarse a un lote.
- **Estado:** disponibilidad comercial del lote: disponible, reservado o vendido.

## Funcionalidades actuales

- Mapa público a pantalla completa.
- Filtros por estado y modelo.
- Zoom, desplazamiento y ajuste del mapa.
- Detalle visual de cada lote.
- Catálogo de modelos de casas y apartamentos.
- Login y logout administrativo.
- Editor visual de lotes mediante polígonos SVG.
- Gestión del plano base.
- Persistencia en PostgreSQL (Supabase).
- Subida de imágenes del plano a Cloudflare R2.

## Funcionalidades previstas o incompletas

- Formulario de contacto real conectado a un canal comercial.
- Gestión de roles administrativos diferenciados.
- Historial de cambios de lotes y modelos.
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
