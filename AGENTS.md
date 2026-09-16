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

- Repositorio: Residencial Amena (Astro 7 + Drizzle + PostgreSQL/Supabase + Cloudflare R2)
- Package manager: **pnpm** (nunca `npm`)
- Idioma de respuesta al usuario: **español**
- Idioma de las instrucciones que recibe el agente: inglés (es la norma del
  flujo de trabajo)

## Entornos: dev, preview y producción

El proyecto corre en 3 entornos sobre **Vercel + Supabase (PostgreSQL) +
Cloudflare R2**. Guía completa en `docs/07-despliegue.md`.

### Dev

```bash
pnpm dev
```

- Astro lee `.env` automáticamente (`DATABASE_URL`, `SESSION_SECRET`, `R2_*`).
- No requiere nada más.

### Preview (build local)

```bash
pnpm build
pnpm preview
```

- Requiere `DATABASE_URL` y `R2_*` en el entorno.
- `pnpm build` es **solo `astro build`**: no aplica migraciones ni seed.

### Producción: Vercel

- Repositorio conectado a Vercel; framework Astro autodetectado.
- Install: `pnpm install`. Build: `pnpm build`.
- Variables de entorno en Vercel → Project → Settings → Environment Variables.
- Migraciones y seed se ejecutan **manualmente**, nunca dentro del build:

```bash
DATABASE_URL="<url-produccion>" pnpm db:migrate
DATABASE_URL="<url-produccion>" ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:seed
```

Puntos de atención:

- `DATABASE_URL` debe usar el **pooler** de Supabase (puerto `6543`).
- Los archivos del plano y de los lotes van a **Cloudflare R2**; Vercel no tiene
  filesystem persistente.
- Datos persistentes fuera de git (backup aparte): la base PostgreSQL de
  Supabase y el bucket de R2.
- El visor `/admin/documentacion` empaqueta los `.md` de `docs/` en la función
  (no los lee del disco en runtime).
