import type { APIRoute } from "astro";
import {
  deletePuntoImagen,
  getPuntoById,
} from "@features/points/punto.service";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const DELETE: APIRoute = jsonApi(async ({ params }) => {
  const puntoId = parseId(params.id);
  const imagenId = parseId(params.imagenId);
  if (puntoId === null || imagenId === null) {
    return json({ ok: false, error: "id inválido" }, 400);
  }

  const path = await deletePuntoImagen(puntoId, imagenId);
  if (path === null) {
    return json({ ok: false, error: "Imagen no encontrada" }, 404);
  }

  const updated = await getPuntoById(puntoId);
  return json(
    { ok: true, data: { id: imagenId, deleted: true, imagenes: updated?.imagenes ?? [] } },
    200,
  );
});
