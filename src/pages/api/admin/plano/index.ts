import type { APIRoute } from "astro";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { extname, join } from "node:path";
import { getPlanoActivo, upsertPlano } from "@modules/plan";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const redirect = (location: string, status = 303): Response =>
  new Response(null, { status, headers: { Location: location } });

function sanitizeExtension(rawName: string): string {
  const ext = extname(rawName).toLowerCase();
  if (ext && ext.length <= 6 && /^[\.a-z0-9]+$/.test(ext)) return ext;
  return ".png";
}

function buildFilename(extension: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rnd}${extension.startsWith(".") ? extension : "." + extension}`;
}

async function saveUpload(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = sanitizeExtension(file.name);
  const filename = buildFilename(ext);
  const filepath = join(UPLOAD_DIR, filename);

  const nodeStream = Readable.fromWeb(file.stream() as any);
  const writeStream = createWriteStream(filepath);
  await pipeline(nodeStream, writeStream);

  return `/uploads/${filename}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/admin/plano?error=Datos de formulario inválidos");
  }

  const nombre = form.get("nombre")?.toString().trim() || undefined;

  const anchoPxRaw = form.get("anchoPx");
  const altoPxRaw = form.get("altoPx");
  const anchoPx = anchoPxRaw === null ? NaN : Number(anchoPxRaw.toString());
  const altoPx = altoPxRaw === null ? NaN : Number(altoPxRaw.toString());

  if (!Number.isFinite(anchoPx) || anchoPx <= 0 || !Number.isInteger(anchoPx)) {
    return redirect("/admin/plano?error=Ancho inválido (debe ser entero positivo)");
  }
  if (!Number.isFinite(altoPx) || altoPx <= 0 || !Number.isInteger(altoPx)) {
    return redirect("/admin/plano?error=Alto inválido (debe ser entero positivo)");
  }

  const file = form.get("imagen");
  let imagenPath: string;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_MIME.has(file.type)) {
      return redirect(
        "/admin/plano?error=Tipo de archivo no soportado (solo PNG, JPG, WEBP, GIF o SVG)",
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return redirect("/admin/plano?error=Imagen muy grande (máximo 10MB)");
    }
    try {
      imagenPath = await saveUpload(file);
    } catch (err) {
      return redirect(
        `/admin/plano?error=${encodeURIComponent(
          "No se pudo guardar la imagen: " +
            (err instanceof Error ? err.message : String(err)),
        )}`,
      );
    }
  } else {
    const current = getPlanoActivo();
    if (!current) {
      return redirect(
        "/admin/plano?error=Debes subir una imagen para crear el primer plano",
      );
    }
    imagenPath = current.imagenPath;
  }

  try {
    upsertPlano({ nombre, imagenPath, anchoPx, altoPx });
  } catch (err) {
    return redirect(
      `/admin/plano?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return redirect("/admin/plano?ok=1");
};
