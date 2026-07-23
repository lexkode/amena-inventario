import type { APIRoute } from "astro";
import {
  createModelo,
  type CreateModeloInput,
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

function parseModeloForm(
  form: FormData,
): { ok: true; data: CreateModeloInput } | { ok: false; error: string } {
  const nombre = form.get("nombre")?.toString().trim() ?? "";
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };
  if (nombre.length > 120) return { ok: false, error: "Nombre demasiado largo" };

  const tipoRaw = form.get("tipo")?.toString();
  if (tipoRaw !== "casa" && tipoRaw !== "apartamento") {
    return { ok: false, error: "Tipo inválido" };
  }
  const tipo = tipoRaw as ModeloTipo;

  const precioBase = parsePositiveNumber(form.get("precioBase"));
  if (precioBase === null || precioBase <= 0) {
    return { ok: false, error: "Precio base inválido" };
  }

  const terrenoM2 = parsePositiveNumber(form.get("terrenoM2"));
  if (terrenoM2 === null || terrenoM2 < 0) {
    return { ok: false, error: "Terreno inválido" };
  }

  const construccionM2 = parsePositiveNumber(form.get("construccionM2"));
  if (construccionM2 === null || construccionM2 <= 0) {
    return { ok: false, error: "Construcción inválida" };
  }

  const habitaciones = parseInteger(form.get("habitaciones"));
  if (habitaciones === null || habitaciones < 0) {
    return { ok: false, error: "Habitaciones inválidas" };
  }

  const banos = parsePositiveNumber(form.get("banos"));
  if (banos === null || banos < 0) {
    return { ok: false, error: "Baños inválidos" };
  }

  const parqueosRaw = form.get("parqueos");
  const parqueos =
    parqueosRaw === null ? 1 : (parseInteger(parqueosRaw) ?? 1);
  if (parqueos < 0) return { ok: false, error: "Parqueos inválidos" };

  const dimensionesLote =
    form.get("dimensionesLote")?.toString().trim() || null;

  const caracteristicas = parseCaracteristicas(form.get("caracteristicas"));

  const ordenRaw = form.get("orden");
  const orden = ordenRaw === null ? 0 : (parseInteger(ordenRaw) ?? 0);

  return {
    ok: true,
    data: {
      nombre,
      tipo,
      precioBase,
      terrenoM2,
      construccionM2,
      habitaciones,
      banos,
      parqueos,
      dimensionesLote,
      caracteristicas,
      orden,
    },
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/admin/modelos?error=Datos de formulario inválidos");
  }

  const parsed = parseModeloForm(form);
  if (!parsed.ok) {
    return redirect(
      `/admin/modelos/nuevo?error=${encodeURIComponent(parsed.error)}`,
    );
  }

  try {
    createModelo(parsed.data);
  } catch (err) {
    return redirect(
      `/admin/modelos/nuevo?error=${encodeURIComponent(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return redirect("/admin/modelos?ok=created");
};
