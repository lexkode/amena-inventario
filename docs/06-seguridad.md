# Seguridad

## Objetivo

Proteger el panel administrativo, los datos del inventario y los archivos subidos sin añadir complejidad innecesaria para una aplicación de un solo proyecto y pocos administradores.

## Autenticación

- El login se realiza mediante `POST /api/auth/login`.
- Las contraseñas se almacenan usando scrypt con salt aleatorio.
- El login devuelve un error genérico cuando las credenciales no son válidas.
- La sesión se guarda en PostgreSQL (Supabase).

## Sesiones

- Cookie: `app_session_id`.
- `httpOnly`: activado.
- `SameSite`: `lax`.
- `secure`: activado en producción.
- Duración actual: 24 horas.
- Las sesiones expiradas se limpian durante el login.
- Logout invalida la sesión y elimina la cookie.

## Autorización

- Las rutas que empiezan por `/admin` requieren una sesión válida.
- Los endpoints administrativos comprueban la existencia de un usuario autenticado.
- El esquema de usuarios contiene `role`, pero todavía no existe una autorización diferenciada por roles.

## Validación

- Los formularios y cuerpos JSON se validan con Zod.
- La validación se ejecuta en el servidor aunque también exista validación visual en el navegador.
- Los estados de lote y tipos de modelo se limitan a valores conocidos.
- Los polígonos requieren al menos tres puntos.

## Protección de contenido dinámico

- El mapa utiliza `escapeHtml` para varios valores insertados en HTML.
- El estado inicial se embebe actualmente como JSON dentro de un script y debe serializarse de forma segura para evitar romper el contexto HTML.
- Los valores dinámicos no deben insertarse con `innerHTML` sin escape.

## Subidas de archivos

- Las subidas se almacenan con nombres generados por la aplicación.
- Existe un límite declarado de 10 MB.
- Se permiten actualmente PNG, JPEG, WEBP, GIF y SVG según el MIME declarado.
- La validación del tipo real del archivo y el tratamiento seguro de SVG son pendientes.
- Los archivos antiguos del plano no se limpian actualmente.

## Secretos

- `.env` está excluido de Git.
- `DATABASE_URL` y `SESSION_SECRET` se configuran mediante variables de entorno.
- El seed actual contiene una credencial administrativa literal y debe corregirse antes de producción.
- `SESSION_SECRET` está declarado en la configuración, pero la implementación actual de sesiones todavía no lo utiliza para firmar o proteger los tokens.

## Riesgos pendientes

- Añadir rate limiting al login.
- Eliminar credenciales hardcodeadas.
- Aplicar autorización por rol.
- Validar el contenido real de los archivos.
- Corregir la serialización JSON embebida.
- Evitar exponer mensajes internos de error.
- Añadir validación geométrica más completa.

## Criterios mínimos antes de producción

- No existen contraseñas ni secretos en el código.
- Todas las rutas administrativas requieren autenticación y autorización adecuada.
- Los datos se validan en el servidor.
- Las imágenes no pueden usarse para ejecutar contenido activo.
- Las sesiones se invalidan correctamente.
- Los errores públicos no revelan detalles internos.
