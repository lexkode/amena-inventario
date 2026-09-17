import type { APIRoute } from "astro";
import { restaurarDesdeRespaldo } from "@features/lots/lote.service";
import { loteBackupSchema } from "@features/lots/lote.types";
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

  const raw = Array.isArray(body)
    ? body
    : ((body as { lotes?: unknown } | null)?.lotes ?? null);

  const snapshot = parse(raw, loteBackupSchema);
  const data = await restaurarDesdeRespaldo(snapshot);
  return json({ ok: true, data }, 200);
});
