import type { APIRoute } from "astro";
import {
  ESTADOS_LOTE,
  type LoteEstado,
  type Punto,
  type UpdateLoteInput,
  deleteLote,
  getLoteById,
  updateLote,
} from "@modules/lots";

const json = (
  body: unknown,
  status: number,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const isLoteEstado = (v: unknown): v is LoteEstado =>
  typeof v === "string" && (ESTADOS_LOTE as readonly string[]).includes(v);

function parsePunto(raw: unknown, index: number): Punto | string {
  if (typeof raw !== "object" || raw === null) {
    return `polígono: punto ${index} inválido`;
  }
  const x = Number((raw as { x: unknown }).x);
  const y = Number((raw as { y: unknown }).y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return `polígono: punto ${index} tiene coordenadas inválidas`;
  }
  return { x, y };
}

function validateUpdate(
  body: unknown,
): { ok: true; data: UpdateLoteInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body inválido" };
  }
  const b = body as Record<string, unknown>;
  const data: UpdateLoteInput = {};

  if ("numeroLote" in b) {
    const n = typeof b.numeroLote === "string" ? b.numeroLote.trim() : "";
    if (!n) return { ok: false, error: "numeroLote no puede estar vacío" };
    if (n.length > 64) {
      return { ok: false, error: "numeroLote demasiado largo (máx 64)" };
    }
    data.numeroLote = n;
  }

  if ("estado" in b) {
    if (!isLoteEstado(b.estado)) {
      return {
        ok: false,
        error: `estado inválido (debe ser uno de: ${ESTADOS_LOTE.join(", ")})`,
      };
    }
    data.estado = b.estado;
  }

  if ("poligono" in b) {
    if (!Array.isArray(b.poligono)) {
      return { ok: false, error: "polígono debe ser un array" };
    }
    if (b.poligono.length < 3) {
      return { ok: false, error: "polígono debe tener al menos 3 puntos" };
    }
    const poligono: Punto[] = [];
    for (let i = 0; i < b.poligono.length; i++) {
      const p = parsePunto(b.poligono[i], i);
      if (typeof p === "string") return { ok: false, error: p };
      poligono.push(p);
    }
    data.poligono = poligono;
  }

  if ("modeloId" in b) {
    if (b.modeloId === null) {
      data.modeloId = null;
    } else {
      const n = Number(b.modeloId);
      if (!Number.isInteger(n) || n <= 0) {
        return { ok: false, error: "modeloId inválido" };
      }
      data.modeloId = n;
    }
  }

  if ("terrenoM2" in b) {
    if (b.terrenoM2 === null || b.terrenoM2 === "") {
      data.terrenoM2 = null;
    } else {
      const n = Number(b.terrenoM2);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: "terrenoM2 inválido" };
      }
      data.terrenoM2 = n;
    }
  }

  if ("dimensionesLote" in b) {
    if (typeof b.dimensionesLote === "string") {
      const trimmed = b.dimensionesLote.trim();
      data.dimensionesLote = trimmed ? trimmed.slice(0, 64) : null;
    } else if (b.dimensionesLote === null) {
      data.dimensionesLote = null;
    } else {
      return { ok: false, error: "dimensionesLote inválido" };
    }
  }

  return { ok: true, data };
}

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

  const parsed = validateUpdate(body);
  if (!parsed.ok) {
    return json({ ok: false, error: parsed.error }, 400);
  }

  try {
    const data = updateLote(id, parsed.data);
    if (!data) {
      return json({ ok: false, error: "Lote no encontrado" }, 404);
    }
    return json({ ok: true, data }, 200);
  } catch (err) {
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      400,
    );
  }
}

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) return json({ ok: false, error: "Unauthorized" }, 401);
  const id = parseId(params);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);
  return handleUpdate(request, id);
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user) return json({ ok: false, error: "Unauthorized" }, 401);
  const id = parseId(params);
  if (id === null) return json({ ok: false, error: "id inválido" }, 400);
  return handleUpdate(request, id);
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return json({ ok: false, error: "Unauthorized" }, 401);
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
};
