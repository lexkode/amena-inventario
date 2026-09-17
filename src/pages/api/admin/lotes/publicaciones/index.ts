import type { APIRoute } from "astro";
import { getPublicaciones } from "@features/lots/lote.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const GET: APIRoute = jsonApi(async () => {
  const data = await getPublicaciones();
  return json({ ok: true, data }, 200);
});
