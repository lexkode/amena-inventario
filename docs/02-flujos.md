# Flujos

## Consultar el mapa público

### Actor

Visitante.

### Pasos

1. El visitante entra en `/`.
2. El servidor obtiene el plano activo, los lotes y los modelos.
3. Astro renderiza la página inicial.
4. El navegador recibe los datos iniciales y carga el script del mapa.
5. El mapa dibuja los lotes sobre la imagen del plano.
6. El visitante puede hacer zoom, desplazarse y filtrar información.

### Resultado

El visitante ve la disponibilidad actual del residencial.

### Alternativa

Si no existe un plano, la página muestra un mensaje de próximamente.

## Consultar un lote

### Actor

Visitante.

### Pasos

1. El visitante selecciona un lote en el mapa.
2. Se abre un modal con el número y estado del lote.
3. Si existe un modelo asociado, se muestran sus datos y características.
4. El visitante puede pulsar `Consultar por este lote`.

### Estado actual

El modal de contacto existe visualmente, pero el formulario comercial real todavía es un punto pendiente.

## Iniciar sesión

### Actor

Administrador.

### Pasos

1. El administrador entra en `/admin/login`.
2. Envía email y contraseña a `POST /api/auth/login`.
3. El servidor valida los datos.
4. Se verifica la contraseña almacenada con scrypt.
5. Se crea una sesión en SQLite.
6. Se establece la cookie `app_session_id`.
7. El usuario es redirigido a `/admin`.

### Errores

- Datos incompletos: se muestra un error de campos requeridos.
- Credenciales inválidas: se muestra un error genérico de login.
- Sesión inexistente o expirada: las rutas administrativas redirigen a `/admin/login`.

## Gestionar modelos

### Actor

Administrador autenticado.

### Operaciones

- Listar modelos desde `/admin/modelos`.
- Crear un modelo desde `/admin/modelos/nuevo`.
- Editar un modelo desde `/admin/modelos/[id]`.
- Eliminar un modelo desde la acción correspondiente.

### Datos gestionados

Nombre, tipo, precio base, superficies, habitaciones, baños, parqueos, dimensiones, características y orden de presentación.

## Gestionar el plano

### Actor

Administrador autenticado.

### Pasos

1. El administrador entra en `/admin/plano`.
2. Introduce nombre y dimensiones del plano.
3. Selecciona una imagen.
4. El servidor valida el formulario y el archivo.
5. La imagen se guarda en `public/uploads`.
6. El registro del plano activo se actualiza en SQLite.

## Crear un lote

### Actor

Administrador autenticado.

### Pasos

1. El administrador abre `/admin/editor`.
2. Selecciona el modo `Dibujar`.
3. Hace clic sobre el plano para crear puntos.
4. Cierra el polígono con al menos tres puntos.
5. Introduce número, estado, modelo y datos opcionales.
6. El navegador envía `POST /api/admin/lotes`.
7. El servidor valida los datos y guarda el lote.
8. El nuevo lote aparece en el editor.

## Editar un lote

### Actor

Administrador autenticado.

### Pasos

1. Selecciona el modo `Editar`.
2. Selecciona un lote existente.
3. Cambia sus datos o mueve sus vértices.
4. El navegador envía `PATCH /api/admin/lotes/[id]`.
5. El servidor valida y guarda los cambios.
6. El editor actualiza el estado local.

## Eliminar un lote

### Actor

Administrador autenticado.

### Pasos

1. Selecciona un lote.
2. Confirma la eliminación.
3. El navegador envía `DELETE /api/admin/lotes/[id]`.
4. El servidor elimina el registro.
5. El lote desaparece del editor.

## Cerrar sesión

### Actor

Administrador autenticado.

### Pasos

1. El administrador ejecuta logout.
2. Se invalida la sesión en SQLite.
3. Se elimina la cookie.
4. El usuario vuelve a `/admin/login`.
