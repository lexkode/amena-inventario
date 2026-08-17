import { asc, eq } from "drizzle-orm";
import { db } from "@core/db/client";
import { lotes, modelos, type Lote, type Modelo } from "@core/db/schema";
import { parsePoligonoJson } from "@core/geometry";
import { parseModelo } from "@features/catalog/modelo.types";
import type {
  CreateLoteInput,
  LoteConModelo,
  UpdateLoteInput,
} from "@features/lots/lote.types";

export type {
  Punto,
  LoteEstado,
  CreateLoteInput,
  UpdateLoteInput,
  LoteConModelo,
} from "@features/lots/lote.types";
export { ESTADOS_LOTE } from "@features/lots/lote.types";

type JoinRow = { lote: Lote; modelo: Modelo | null };

function toLoteConModelo(row: JoinRow): LoteConModelo {
  const { poligonoJson, ...rest } = row.lote;
  return {
    ...rest,
    poligono: parsePoligonoJson(poligonoJson),
    modelo: row.modelo ? parseModelo(row.modelo) : null,
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
  const exists = db
    .select({ id: modelos.id })
    .from(modelos)
    .where(eq(modelos.id, modeloId))
    .get();
  return exists ? null : `modeloId ${modeloId} no existe`;
}

export function createLote(input: CreateLoteInput): LoteConModelo {
  const modeloError = assertModeloExists(input.modeloId ?? null);
  if (modeloError) throw new Error(modeloError);

  const inserted = db
    .insert(lotes)
    .values({
      numeroLote: input.numeroLote,
      estado: input.estado,
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