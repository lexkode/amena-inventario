import type { APIRoute } from "astro";
import { publicarLotes } from "@features/lots/lote.service";
import { publicarPuntos } from "@features/points/punto.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const POST: APIRoute = jsonApi(async () => {
  try {
    const [lotes, puntos] = await Promise.all([
      publicarLotes(),
      publicarPuntos(),
    ]);
    return json({ ok: true, data: { ...lotes, totalPuntos: puntos.totalPuntos } }, 201);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al publicar" },
      400,
    );
  }
});
