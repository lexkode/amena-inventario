import type { APIRoute } from "astro";
import { deleteUploadIfUnused } from "@features/media/media.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";
import {
  ALLOWED_MIME,
  MAX_FILE_SIZE,
  isManagedUploadUrl,
  listUploads,
  saveUpload,
} from "@core/storage";

export const GET: APIRoute = jsonApi(async () => {
  const imagenes = await listUploads();
  return json({ ok: true, data: { imagenes } }, 200);
});

export const POST: APIRoute = jsonApi(async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Formato de formulario inválido" }, 400);
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

  return json({ ok: true, data: { path } }, 200);
});

export const DELETE: APIRoute = jsonApi(async ({ request }) => {
  let body: { path?: unknown };
  try {
    body = (await request.json()) as { path?: unknown };
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  if (typeof body.path !== "string" || !isManagedUploadUrl(body.path)) {
    return json({ ok: false, error: "Imagen inválida" }, 400);
  }

  const result = await deleteUploadIfUnused(body.path);
  if (!result.ok) return json({ ok: false, error: result.error }, 409);

  return json({ ok: true, data: { deleted: true } }, 200);
});
