# Agent Rules

## Commits

**Solo hacer commit cuando el usuario lo pida explícitamente.** No commitear
después de cada cambio, no matter how small. Esperar a que el usuario escriba
algo como "haz commit", "commitea", "commit", o similar antes de ejecutar
`git add` + `git commit`.

Confirmación previa opcional: si un cambio es grande o ambiguo, se puede
preguntar antes de commitear, pero la regla base es **esperar la instrucción
explícita**.

## Notas adicionales

- Repositorio: Residencial Amena (Astro 7 + Drizzle + better-sqlite3)
- Package manager: **pnpm** (nunca `npm`)
- Idioma de respuesta al usuario: **español**
- Idioma de las instrucciones que recibe el agente: inglés (es la norma del
  flujo de trabajo)

## Entornos: dev, preview y producción

El proyecto corre en 3 entornos. `SESSION_SECRET` (firma de cookies de sesión
del admin) es obligatorio en preview y producción; en dev el `.env` ya lo trae.

### Dev

```bash
pnpm dev
```

- Astro lee `.env` automáticamente (`DATABASE_URL`, `SESSION_SECRET`).
- No requiere nada más.

### Preview (build local)

```bash
pnpm build
SESSION_SECRET=<secret> pnpm preview
```

- `pnpm preview` NO lee el `.env`: la variable hay que exportarla en la
  terminal (o anteponerla al comando como arriba).
- Si falta, cada request falla con `EnvInvalidVariables: SESSION_SECRET is
  missing`.

### Producción: Hostinger hPanel (Administrador de Node.js)

Deploy en hosting compartido con soporte Node.js (hPanel), NO VPS. No hay
systemd ni Nginx que configurar: hPanel proxea el dominio a la app y asigna
el puerto vía `PORT` (el adapter `@astrojs/node` lo respeta solo).

Pasos:

1. Subir el código (Git desde hPanel o SSH/FTP).
2. Por SSH, en el directorio del proyecto:
   ```bash
   pnpm install
   pnpm build
   ```
   Si `pnpm` no está disponible: `corepack enable && corepack prepare
   pnpm@latest --activate`.
3. En hPanel → Node.js, configurar la app:
   - **Startup file:** `dist/server/entry.mjs`
   - **Versión de Node:** 20 o superior
   - **Variables de entorno:** `SESSION_SECRET` con un secret NUEVO de prod
     (generar con `openssl rand -base64 32`). Distinto al de dev. NO subir el
     `.env` de desarrollo.
4. Arrancar la app desde el panel. Los logs se ven en el mismo panel.

Puntos de atención:

- `better-sqlite3` es código nativo: se compila en `pnpm install`. Normalmente
  trae prebuilds para Linux x64 y funciona; si el install falla, ese es el
  primer lugar a mirar.
- Datos persistentes fuera de git (backup aparte): `sqlite.db` y
  `public/uploads/`.
