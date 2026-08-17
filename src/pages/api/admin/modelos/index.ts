import type { APIRoute } from "astro";
import { createModelo } from "@features/catalog/modelo.service";
import { modeloFormSchema } from "@features/catalog/modelo.types";
import { formToObject, parse } from "@core/validation/parse";
import { formApi } from "@core/http/api";
import { redirect } from "@core/http/json";

export const POST: APIRoute = formApi(async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/admin/modelos?error=Datos de formulario inválidos");
  }

  try {
    const input = parse(formToObject(form), modeloFormSchema);
    createModelo(input);
  } catch (err) {
    return redirect(
      `/admin/modelos/nuevo?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return redirect("/admin/modelos?ok=created");
});