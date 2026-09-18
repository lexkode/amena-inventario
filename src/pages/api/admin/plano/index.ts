import type { APIRoute } from "astro";
import { getPlanoActivo, upsertPlano } from "@features/plan/plano.service";
import { planoUpsertSchema, type PlanoUpsertInput } from "@features/plan/plano.types";
import { formToObject, parse } from "@core/validation/parse";
import { formApi } from "@core/http/api";
import { redirect } from "@core/http/json";
import {
  ALLOWED_MIME,
  MAX_FILE_SIZE,
  saveUpload,
} from "@core/storage";

export const POST: APIRoute = formApi(async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/admin/plano?error=Datos de formulario inválidos");
  }

  let input: PlanoUpsertInput;
  try {
    input = parse(formToObject(form), planoUpsertSchema);
  } catch (err) {
    return redirect(
      `/admin/plano?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
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
    const current = await getPlanoActivo();
    if (!current) {
      return redirect(
        "/admin/plano?error=Debes subir una imagen para crear el primer plano",
      );
    }
    imagenPath = current.imagenPath;
  }

  try {
    await upsertPlano({
      nombre: input.nombre,
      imagenPath,
      anchoPx: input.anchoPx,
      altoPx: input.altoPx,
      opacidad: input.opacidad,
    });
  } catch (err) {
    return redirect(
      `/admin/plano?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return redirect("/admin/plano?ok=1");
});