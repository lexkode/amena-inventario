import type { APIRoute } from "astro";
import {
  deletePunto,
  updatePunto,
} from "@features/points/punto.service";
import { puntoUpdateSchema } from "@features/points/punto.types";
import { parse } from "@core/validation/parse";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const PATCH: APIRoute = jsonApi(async ({ request, params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const input = parse(body, puntoUpdateSchema);
  try {
    const data = await updatePunto(id, input);
    if (!data) return json({ ok: false, error: "Punto de interés no encontrado" }, 404);
    return json({ ok: true, data }, 200);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al actualizar" },
      400,
    );
  }
});

export const DELETE: APIRoute = jsonApi(async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);
  const deleted = await deletePunto(id);
  if (!deleted) return json({ ok: false, error: "Punto de interés no encontrado" }, 404);
  return json({ ok: true, data: { id, deleted: true } }, 200);
});
