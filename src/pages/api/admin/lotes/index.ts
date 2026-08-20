import type { APIRoute } from "astro";
import { createLote, getLotes } from "@features/lots/lote.service";
import { loteCreateSchema } from "@features/lots/lote.types";
import { parse } from "@core/validation/parse";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const GET: APIRoute = jsonApi(() => {
  const data = getLotes();
  return json({ ok: true, data }, 200);
});

export const POST: APIRoute = jsonApi(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const input = parse(body, loteCreateSchema);
  try {
    const data = createLote(input);
    return json({ ok: true, data }, 201);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al crear el lote" },
      400,
    );
  }
});