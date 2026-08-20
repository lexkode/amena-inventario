import type { APIRoute } from "astro";
import {
  deleteLoteImagen,
  getImagenesByLote,
} from "@features/lots/lote.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";
import { deleteUpload } from "@core/storage";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const DELETE: APIRoute = jsonApi(async ({ params }) => {
  const loteId = parseId(params.id);
  const imagenId = parseId(params.imagenId);
  if (loteId === null || imagenId === null) {
    return json({ ok: false, error: "id inválido" }, 400);
  }

  const path = deleteLoteImagen(loteId, imagenId);
  if (path === null) {
    return json({ ok: false, error: "Imagen no encontrada" }, 404);
  }

  await deleteUpload(path);
  return json(
    { ok: true, data: { id: imagenId, deleted: true, imagenes: getImagenesByLote(loteId) } },
    200,
  );
});
