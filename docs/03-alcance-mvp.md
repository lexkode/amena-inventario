# Alcance Del MVP

## Objetivo del MVP

Ofrecer una web pública funcional para consultar la disponibilidad de viviendas y un panel administrativo que permita mantener esa información actualizada.

## Incluido

### Web pública

- Visualización del plano activo.
- Dibujo de casas sobre el plano.
- Colores por estado.
- Filtro por estado.
- Filtro por modelo.
- Zoom y desplazamiento.
- Modal de detalle de la vivienda.
- Información del modelo asociado.

### Panel administrativo

- Login y logout.
- Protección de rutas `/admin`.
- Listado, creación, edición y eliminación de modelos.
- Subida y actualización del plano.
- Editor visual de casas.
- Creación, edición y eliminación de casas.
- Cambio de estado de la casa.
- Asociación de un modelo a una casa.

### Datos

- Usuarios.
- Sesiones.
- Planos.
- Modelos.
- Casas.
- Migraciones Drizzle.
- Seed inicial de modelos y administrador.

## No incluido en el MVP

- Reservas online.
- Pagos.
- CRM.
- Historial de cambios.
- Notificaciones por email o WhatsApp.
- Roles administrativos distintos.
- Varios residenciales.
- Gestión de clientes.
- Contratos.
- Imágenes individuales de cada modelo.
- Aplicación móvil.

## Criterios de aceptación

- Un visitante puede abrir la web sin autenticarse.
- El visitante puede identificar viviendas por color y número.
- El visitante puede consultar los datos de una vivienda.
- Un administrador puede iniciar y cerrar sesión.
- Un administrador puede actualizar un modelo.
- Un administrador puede subir un plano.
- Un administrador puede dibujar una casa nueva.
- Un administrador puede editar el estado y la geometría de una casa.
- Los cambios guardados aparecen en la web pública después de recargar.
- Los datos sobreviven al reinicio del servidor.

## Mejoras posteriores prioritarias

- Formulario de contacto conectado a un canal real.
- Rate limiting del login.
- Autorización por rol.
- Validación geométrica avanzada.
- Restricción única para el número de casa.
- Validación segura del contenido de imágenes.
- Limpieza de imágenes antiguas.
- Tests automatizados.
- Backups operativos.

## Indicador de éxito

El equipo comercial puede actualizar el inventario sin ayuda técnica y un visitante puede pasar del mapa a una consulta comercial con la información suficiente.
