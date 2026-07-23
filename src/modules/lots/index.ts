import { asc, eq } from "drizzle-orm";
import { db } from "@db/client";
import { getModeloById } from "@modules/catalog";
import { lotes, modelos, type Lote, type LoteEstado, type Modelo } from "@db/schema";

export type Punto = { x: number; y: number };
export type { LoteEstado };

export const ESTADOS_LOTE: readonly LoteEstado[] = [
  "disponible",
  "reservado",
  "vendido",
] as const;

export type LoteConModelo = Omit<Lote, "poligonoJson"> & {
  poligono: Punto[];
  modelo: Modelo | null;
};

export type CreateLoteInput = {
  numeroLote: string;
  estado?: LoteEstado;
  poligono: Punto[];
  modeloId?: number | null;
  terrenoM2?: number | null;
  dimensionesLote?: string | null;
};

export type UpdateLoteInput = Partial<CreateLoteInput>;

function parsePoligono(json: string): Punto[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is Punto =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as { x: unknown }).x === "number" &&
          typeof (p as { y: unknown }).y === "number" &&
          Number.isFinite((p as Punto).x) &&
          Number.isFinite((p as Punto).y),
      )
      .map((p) => ({ x: p.x, y: p.y }));
  } catch {
    return [];
  }
}

type JoinRow = { lote: Lote; modelo: Modelo | null };

function toLoteConModelo(row: JoinRow): LoteConModelo {
  const { poligonoJson, ...rest } = row.lote;
  return {
    ...rest,
    poligono: parsePoligono(poligonoJson),
    modelo: row.modelo,
  };
}

export function getLotes(): LoteConModelo[] {
  const rows = db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .orderBy(asc(lotes.numeroLote), asc(lotes.id))
    .all();
  return rows.map(toLoteConModelo);
}

export function getLoteById(id: number): LoteConModelo | null {
  const row = db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .where(eq(lotes.id, id))
    .get();
  return row ? toLoteConModelo(row) : null;
}

function assertModeloExists(modeloId: number | null): string | null {
  if (modeloId === null) return null;
  const modelo = getModeloById(modeloId);
  return modelo ? null : `modeloId ${modeloId} no existe`;
}

export function createLote(input: CreateLoteInput): LoteConModelo {
  const modeloError = assertModeloExists(input.modeloId ?? null);
  if (modeloError) throw new Error(modeloError);

  const inserted = db
    .insert(lotes)
    .values({
      numeroLote: input.numeroLote,
      estado: input.estado ?? "disponible",
      poligonoJson: JSON.stringify(input.poligono),
      modeloId: input.modeloId ?? null,
      terrenoM2: input.terrenoM2 ?? null,
      dimensionesLote: input.dimensionesLote ?? null,
    })
    .returning()
    .get();

  const created = getLoteById(inserted.id);
  if (!created) {
    throw new Error("No se pudo recuperar el lote recién creado");
  }
  return created;
}

export function updateLote(
  id: number,
  input: UpdateLoteInput,
): LoteConModelo | null {
  const updates: Partial<Lote> = {};
  if (input.numeroLote !== undefined) updates.numeroLote = input.numeroLote;
  if (input.estado !== undefined) updates.estado = input.estado;
  if (input.poligono !== undefined) {
    updates.poligonoJson = JSON.stringify(input.poligono);
  }
  if (input.modeloId !== undefined) {
    const modeloError = assertModeloExists(input.modeloId);
    if (modeloError) throw new Error(modeloError);
    updates.modeloId = input.modeloId;
  }
  if (input.terrenoM2 !== undefined) updates.terrenoM2 = input.terrenoM2;
  if (input.dimensionesLote !== undefined) updates.dimensionesLote = input.dimensionesLote;

  if (Object.keys(updates).length > 0) {
    const result = db
      .update(lotes)
      .set(updates)
      .where(eq(lotes.id, id))
      .run();
    if (result.changes === 0) return null;
  }
  return getLoteById(id);
}

export function deleteLote(id: number): boolean {
  const result = db.delete(lotes).where(eq(lotes.id, id)).run();
  return result.changes > 0;
}
