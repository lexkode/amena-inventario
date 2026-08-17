import type { APIRoute } from "astro";
import { deleteModelo, updateModelo } from "@features/catalog/modelo.service";
import { modeloFormSchema } from "@features/catalog/modelo.types";
import { formToObject, parse } from "@core/validation/parse";
import { formApi } from "@core/http/api";
import { redirect } from "@core/http/json";

export const POST: APIRoute = formApi(async ({ request, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return redirect("/admin/modelos?error=ID inválido");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/admin/modelos?error=Datos de formulario inválidos");
  }

  const method = (form.get("_method") ?? "PATCH").toString().toUpperCase();

  if (method === "DELETE") {
    const ok = deleteModelo(id);
    if (!ok) {
      return redirect("/admin/modelos?error=Modelo no encontrado");
    }
    return redirect("/admin/modelos?ok=deleted");
  }

  if (method !== "PATCH" && method !== "PUT") {
    return redirect("/admin/modelos?error=Método no soportado");
  }

  try {
    const input = parse(formToObject(form), modeloFormSchema);
    const updated = updateModelo(id, input);
    if (!updated) {
      return redirect("/admin/modelos?error=Modelo no encontrado");
    }
  } catch (err) {
    return redirect(
      `/admin/modelos/${id}?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return redirect("/admin/modelos?ok=updated");
});