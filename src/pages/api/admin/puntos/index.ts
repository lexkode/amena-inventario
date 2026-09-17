import type { APIRoute } from "astro";
import { createPunto, getPuntos } from "@features/points/punto.service";
import { puntoCreateSchema } from "@features/points/punto.types";
import { parse } from "@core/validation/parse";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const GET: APIRoute = jsonApi(async () => {
  const data = await getPuntos();
  return json({ ok: true, data }, 200);
});

export const POST: APIRoute = jsonApi(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const input = parse(body, puntoCreateSchema);
  try {
    const data = await createPunto(input);
    return json({ ok: true, data }, 201);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al crear el punto de interés" },
      400,
    );
  }
});
