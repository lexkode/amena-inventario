import type { APIRoute } from "astro";
import {
  deleteLote,
  getLoteById,
  updateLote,
} from "@features/lots/lote.service";
import { loteUpdateSchema } from "@features/lots/lote.types";
import { parse } from "@core/validation/parse";
import { jsonApi } from "@core/http/api";
import { json } from "@core/http/json";

function parseId(params: Record<string, string | undefined>): number | null {
  const raw = params.id;
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function handleUpdate(
  request: Request,
  id: number,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const input = parse(body, loteUpdateSchema);
  try {
    const data = updateLote(id, input);
    if (!data) {
      return json({ ok: false, error: "Lote no encontrado" }, 404);
    }
    return json({ ok: true, data }, 200);
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "Error al actualizar el lote" },
      400,
    );
  }
}

export const PATCH: APIRoute = jsonApi(async ({ request, params }) => {
  const id = parseId(params);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);
  return handleUpdate(request, id);
});

export const PUT: APIRoute = jsonApi(async ({ request, params }) => {
  const id = parseId(params);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);
  return handleUpdate(request, id);
});

export const DELETE: APIRoute = jsonApi(async ({ params }) => {
  const id = parseId(params);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);

  const current = getLoteById(id);
  if (!current) {
    return json({ ok: false, error: "Lote no encontrado" }, 404);
  }

  const ok = deleteLote(id);
  if (!ok) {
    return json({ ok: false, error: "No se pudo eliminar" }, 500);
  }
  return json({ ok: true, data: { id, deleted: true } }, 200);
});