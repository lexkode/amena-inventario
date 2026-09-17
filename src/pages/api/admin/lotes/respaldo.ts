import type { APIRoute } from "astro";
import { getLotes } from "@features/lots/lote.service";
import { saveJsonBackup } from "@core/storage";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

export const POST: APIRoute = jsonApi(async () => {
  const lotes = await getLotes();
  const fecha = new Date().toISOString().slice(0, 10);
  const url = await saveJsonBackup(lotes, `respaldo-lotes-${fecha}.json`);
  return json({ ok: true, data: { url, totalLotes: lotes.length } }, 200);
});
