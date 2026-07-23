import type { APIRoute } from "astro";
import {
  deleteModelo,
  updateModelo,
  type UpdateModeloInput,
} from "@modules/catalog";
import type { ModeloTipo } from "@db/schema";

const redirect = (location: string, status = 303): Response =>
  new Response(null, { status, headers: { Location: location } });

function parsePositiveNumber(
  value: FormDataEntryValue | null,
): number | null {
  if (value === null) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : null;
}

function parseInteger(
  value: FormDataEntryValue | null,
): number | null {
  const n = parsePositiveNumber(value);
  if (n === null) return null;
  return Number.isInteger(n) ? n : null;
}

function parseCaracteristicas(raw: FormDataEntryValue | null): string[] {
  if (raw === null) return [];
  return raw
    .toString()
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parsePartialModeloForm(
  form: FormData,
): { ok: true; data: UpdateModeloInput } | { ok: false; error: string } {
  const data: UpdateModeloInput = {};

  if (form.has("nombre")) {
    const nombre = form.get("nombre")?.toString().trim() ?? "";
    if (!nombre) return { ok: false, error: "El nombre es obligatorio" };
    if (nombre.length > 120) return { ok: false, error: "Nombre demasiado largo" };
    data.nombre = nombre;
  }

  if (form.has("tipo")) {
    const tipoRaw = form.get("tipo")?.toString();
    if (tipoRaw !== "casa" && tipoRaw !== "apartamento") {
      return { ok: false, error: "Tipo inválido" };
    }
    data.tipo = tipoRaw as ModeloTipo;
  }

  if (form.has("precioBase")) {
    const v = parsePositiveNumber(form.get("precioBase"));
    if (v === null || v <= 0) return { ok: false, error: "Precio inválido" };
    data.precioBase = v;
  }

  if (form.has("terrenoM2")) {
    const v = parsePositiveNumber(form.get("terrenoM2"));
    if (v === null || v < 0) return { ok: false, error: "Terreno inválido" };
    data.terrenoM2 = v;
  }

  if (form.has("construccionM2")) {
    const v = parsePositiveNumber(form.get("construccionM2"));
    if (v === null || v <= 0)
      return { ok: false, error: "Construcción inválida" };
    data.construccionM2 = v;
  }

  if (form.has("habitaciones")) {
    const v = parseInteger(form.get("habitaciones"));
    if (v === null || v < 0)
      return { ok: false, error: "Habitaciones inválidas" };
    data.habitaciones = v;
  }

  if (form.has("banos")) {
    const v = parsePositiveNumber(form.get("banos"));
    if (v === null || v < 0) return { ok: false, error: "Baños inválidos" };
    data.banos = v;
  }

  if (form.has("parqueos")) {
    const v = parseInteger(form.get("parqueos"));
    if (v === null || v < 0) return { ok: false, error: "Parqueos inválidos" };
    data.parqueos = v;
  }

  if (form.has("dimensionesLote")) {
    data.dimensionesLote = form.get("dimensionesLote")?.toString().trim() || null;
  }

  if (form.has("caracteristicas")) {
    data.caracteristicas = parseCaracteristicas(form.get("caracteristicas"));
  }

  if (form.has("orden")) {
    const v = parseInteger(form.get("orden"));
    if (v === null) return { ok: false, error: "Orden inválido" };
    data.orden = v;
  }

  return { ok: true, data };
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

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

  const parsed = parsePartialModeloForm(form);
  if (!parsed.ok) {
    return redirect(
      `/admin/modelos/${id}?error=${encodeURIComponent(parsed.error)}`,
    );
  }

  try {
    const updated = updateModelo(id, parsed.data);
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
};
