import type { APIRoute } from "astro";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";
import { parse } from "@core/validation/parse";
import { createTorre, getTorres } from "@features/lots/torre.service";
import { torreCreateSchema } from "@features/lots/torre.types";

export const GET: APIRoute = jsonApi(async () => json({ ok: true, data: await getTorres() }, 200));
export const POST: APIRoute = jsonApi(async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const input = parse(body, torreCreateSchema);
  try { return json({ ok: true, data: await createTorre(input) }, 201); }
  catch (err) { return json({ ok: false, error: err instanceof Error ? err.message : "Error al crear el edificio" }, 400); }
});
