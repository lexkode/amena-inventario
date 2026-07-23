import type { APIRoute } from "astro";
import {
  ESTADOS_LOTE,
  type CreateLoteInput,
  type LoteEstado,
  type Punto,
  createLote,
  getLotes,
} from "@modules/lots";

const json = (
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
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

function validateCreate(
  body: unknown,
): { ok: true; data: CreateLoteInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body inválido" };
  }
  const b = body as Record<string, unknown>;

  const numeroLote =
    typeof b.numeroLote === "string" ? b.numeroLote.trim() : "";
  if (!numeroLote) return { ok: false, error: "numeroLote es obligatorio" };
  if (numeroLote.length > 64) {
    return { ok: false, error: "numeroLote demasiado largo (máx 64)" };
  }

  let estado: LoteEstado = "disponible";
  if (b.estado !== undefined) {
    if (!isLoteEstado(b.estado)) {
      return {
        ok: false,
        error: `estado inválido (debe ser uno de: ${ESTADOS_LOTE.join(", ")})`,
      };
    }
    estado = b.estado;
  }

  if (!Array.isArray(b.poligono)) {
    return { ok: false, error: "polígono es requerido y debe ser un array" };
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

  let modeloId: number | null = null;
  if (b.modeloId !== undefined && b.modeloId !== null) {
    const n = Number(b.modeloId);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, error: "modeloId inválido" };
    }
    modeloId = n;
  }

  let terrenoM2: number | null = null;
  if (b.terrenoM2 !== undefined && b.terrenoM2 !== null && b.terrenoM2 !== "") {
    const n = Number(b.terrenoM2);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "terrenoM2 inválido" };
    }
    terrenoM2 = n;
  }

  const dimensionesLote =
    typeof b.dimensionesLote === "string" && b.dimensionesLote.trim()
      ? b.dimensionesLote.trim().slice(0, 64)
      : null;

  return {
    ok: true,
    data: { numeroLote, estado, poligono, modeloId, terrenoM2, dimensionesLote },
  };
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  const data = getLotes();
  return json({ ok: true, data }, 200);
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const parsed = validateCreate(body);
  if (!parsed.ok) {
    return json({ ok: false, error: parsed.error }, 400);
  }

  try {
    const data = createLote(parsed.data);
    return json({ ok: true, data }, 201);
  } catch (err) {
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      400,
    );
  }
};
