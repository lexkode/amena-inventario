import type { APIRoute } from "astro";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";
import { deleteTorre, updateTorre } from "@features/lots/torre.service";
import { torreUpdateSchema } from "@features/lots/torre.types";
import { parse } from "@core/validation/parse";

export const DELETE: APIRoute = jsonApi(async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "id inválido" }, 400);
  let body: { confirmar?: boolean };
  try { body = await request.json(); } catch { return json({ ok: false, error: "Debes confirmar la eliminación del edificio y sus apartamentos" }, 400); }
  if (body?.confirmar !== true) return json({ ok: false, error: "Debes confirmar la eliminación del edificio y sus apartamentos" }, 400);
  try {
    const deleted = await deleteTorre(id);
    return json({ ok: deleted, ...(deleted ? {} : { error: "Edificio no encontrado" }) }, deleted ? 200 : 404);
  } catch (err) { return json({ ok: false, error: err instanceof Error ? err.message : "Error al eliminar el edificio" }, 400); }
});

export const PATCH: APIRoute = jsonApi(async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "id inválido" }, 400);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const input = parse(body, torreUpdateSchema);
  if (!Object.keys(input).length) return json({ ok: false, error: "No hay campos para actualizar" }, 400);
  try {
    const data = await updateTorre(id, input);
    return json(data ? { ok: true, data } : { ok: false, error: "Edificio no encontrado" }, data ? 200 : 404);
  } catch (err) { return json({ ok: false, error: err instanceof Error ? err.message : "Error al actualizar el edificio" }, 400); }
});
