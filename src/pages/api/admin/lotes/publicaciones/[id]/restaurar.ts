import type { APIRoute } from "astro";
import { restaurarPublicacion } from "@features/lots/lote.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const POST: APIRoute = jsonApi(async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);

  const data = await restaurarPublicacion(id);
  if (!data) return json({ ok: false, error: "Publicación no encontrada" }, 404);

  return json({ ok: true, data }, 200);
});
