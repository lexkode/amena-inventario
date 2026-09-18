import type { APIRoute } from "astro";
import {
  addPuntoImagen,
  getPuntoById,
  MAX_IMAGENES_POR_PUNTO,
} from "@features/points/punto.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";
import {
  ALLOWED_MIME,
  MAX_FILE_SIZE,
  isManagedUploadUrl,
  saveUpload,
} from "@core/storage";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const POST: APIRoute = jsonApi(async ({ request, params }) => {
  const puntoId = parseId(params.id);
  if (puntoId === null) return json({ ok: false, error: "id inválido" }, 400);

  const punto = await getPuntoById(puntoId);
  if (!punto) return json({ ok: false, error: "Punto de interés no encontrado" }, 404);

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    let body: { paths?: unknown };
    try {
      body = (await request.json()) as { paths?: unknown };
    } catch {
      return json({ ok: false, error: "JSON inválido" }, 400);
    }

    const rawPaths = Array.isArray(body.paths) ? body.paths : [];
    const paths = rawPaths.filter(
      (p): p is string => typeof p === "string" && isManagedUploadUrl(p),
    );
    if (paths.length === 0) {
      return json({ ok: false, error: "No se seleccionaron imágenes válidas" }, 400);
    }

    const existentes = new Set(punto.imagenes.map((i) => i.path));
    const nuevos = paths.filter((p) => !existentes.has(p));
    if (punto.imagenes.length + nuevos.length > MAX_IMAGENES_POR_PUNTO) {
      return json(
        { ok: false, error: `Máximo ${MAX_IMAGENES_POR_PUNTO} imágenes por punto de interés` },
        400,
      );
    }

    const added: { id: number; path: string }[] = [];
    for (const p of nuevos) added.push(await addPuntoImagen(puntoId, p));
    const updated = await getPuntoById(puntoId);
    return json(
      { ok: true, data: { added, imagenes: updated?.imagenes ?? [] } },
      200,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Formato de formulario inválido" }, 400);
  }

  if (punto.imagenes.length >= MAX_IMAGENES_POR_PUNTO) {
    return json(
      { ok: false, error: `Máximo ${MAX_IMAGENES_POR_PUNTO} imágenes por punto de interés` },
      400,
    );
  }

  const file = form.get("imagen");
  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, error: "Debes adjuntar una imagen" }, 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json(
      { ok: false, error: "Tipo de archivo no soportado (solo PNG, JPG, WEBP, GIF o SVG)" },
      400,
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return json({ ok: false, error: "Imagen muy grande (máximo 10MB)" }, 400);
  }

  let path: string;
  try {
    path = await saveUpload(file);
  } catch {
    return json({ ok: false, error: "No se pudo guardar la imagen" }, 500);
  }

  const added = await addPuntoImagen(puntoId, path);
  const updated = await getPuntoById(puntoId);
  return json({ ok: true, data: { added, imagenes: updated?.imagenes ?? [] } }, 200);
});
