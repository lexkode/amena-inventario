import type { APIRoute } from "astro";
import { publicarLotes } from "@features/lots/lote.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const POST: APIRoute = jsonApi(async () => {
  try {
    const data = await publicarLotes();
    return json({ ok: true, data }, 201);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al publicar" },
      400,
    );
  }
});
