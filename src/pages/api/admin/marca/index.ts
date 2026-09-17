import type { APIRoute } from "astro";
import {
  getMarca,
  upsertMarca,
  normalizeTipografia,
} from "@features/branding/marca.service";
import { BRAND_TOKENS, HEX_COLOR_RE } from "@features/branding/marca.types";
import { formApi } from "@core/http/api";
import { redirect } from "@core/http/json";
import { ALLOWED_MIME, MAX_FILE_SIZE, saveUpload } from "@core/storage";

function fail(message: string): Response {
  return redirect(`/admin/marca?error=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = formApi(async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Datos de formulario inválidos");
  }

  const accion = String(form.get("accion") ?? "guardar");
  const current = await getMarca();
  const tipografia = normalizeTipografia(form.get("tipografia"));

  const colores: Record<string, string> = {};
  for (const token of BRAND_TOKENS) {
    const raw = form.get(token.key);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    if (!HEX_COLOR_RE.test(value)) {
      return fail(`Color inválido para "${token.label}"`);
    }
    if (value.toLowerCase() !== token.default.toLowerCase()) {
      colores[token.key] = value;
    }
  }

  if (accion === "reset-logos") {
    try {
      await upsertMarca({
        colores,
        logoFrontPath: null,
        logoAdminPath: null,
        logoAdminColapsadoPath: null,
        tipografia,
      });
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
    return redirect("/admin/marca?ok=logos");
  }

  async function resolveLogo(field: string, fallback: string | null): Promise<string | null> {
    const file = form.get(field);
    if (!(file instanceof File) || file.size === 0) return fallback;
    if (!ALLOWED_MIME.has(file.type)) {
      throw new Error("Tipo de archivo no soportado (solo PNG, JPG, WEBP, GIF o SVG)");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Archivo muy grande (máximo 10MB)");
    }
    return await saveUpload(file);
  }

  try {
    const logoFrontPath = await resolveLogo("logoFront", current.logoFrontPath);
    const logoAdminPath = await resolveLogo("logoAdmin", current.logoAdminPath);
    const logoAdminColapsadoPath = await resolveLogo(
      "logoAdminColapsado",
      current.logoAdminColapsadoPath,
    );
    await upsertMarca({
      colores,
      logoFrontPath,
      logoAdminPath,
      logoAdminColapsadoPath,
      tipografia,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  return redirect("/admin/marca?ok=1");
});
