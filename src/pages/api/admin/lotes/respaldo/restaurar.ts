import type { APIRoute } from "astro";
import { restaurarDesdeRespaldo } from "@features/lots/lote.service";
import { documentoBackupSchema } from "@features/lots/documento.types";
import { parse } from "@core/validation/parse";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const POST: APIRoute = jsonApi(async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const snapshot = parse(body, documentoBackupSchema);
  const data = await restaurarDesdeRespaldo(snapshot);
  return json({ ok: true, data }, 200);
});
