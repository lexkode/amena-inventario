import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@core/db/client";
import { lotes, loteImagenes, modelos, type Lote, type Modelo } from "@core/db/schema";
import { parsePoligonoJson } from "@core/geometry";
import { modeloExiste } from "@features/catalog/modelo.service";
import { parseModelo } from "@features/catalog/modelo.types";
import type {
  CreateLoteInput,
  LoteConModelo,
  LoteImagenItem,
  UpdateLoteInput,
} from "@features/lots/lote.types";

export type {
  Punto,
  LoteEstado,
  CreateLoteInput,
  UpdateLoteInput,
  LoteConModelo,
  LoteImagenItem,
} from "@features/lots/lote.types";
export { ESTADOS_LOTE, MAX_IMAGENES_POR_LOTE } from "@features/lots/lote.types";

type JoinRow = { lote: Lote; modelo: Modelo | null };

function getImagenesMap(): Map<number, LoteImagenItem[]> {
  const rows = db
    .select()
    .from(loteImagenes)
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id))
    .all();
  const map = new Map<number, LoteImagenItem[]>();
  for (const row of rows) {
    const arr = map.get(row.loteId) ?? [];
    arr.push({ id: row.id, path: row.path });
    map.set(row.loteId, arr);
  }
  return map;
}

function toLoteConModelo(
  row: JoinRow,
  imagenes: Map<number, LoteImagenItem[]> = new Map(),
): LoteConModelo {
  const { poligonoJson, ...rest } = row.lote;
  return {
    ...rest,
    poligono: parsePoligonoJson(poligonoJson),
    modelo: row.modelo ? parseModelo(row.modelo) : null,
    imagenes: imagenes.get(row.lote.id) ?? [],
  };
}

export function getLotes(): LoteConModelo[] {
  const rows = db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .orderBy(asc(lotes.numeroLote), asc(lotes.id))
    .all();
  const imagenes = getImagenesMap();
  return rows.map((r) => toLoteConModelo(r, imagenes));
}

export function getLoteById(id: number): LoteConModelo | null {
  const row = db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .where(eq(lotes.id, id))
    .get();
  if (!row) return null;
  const imagenes = getImagenesByLote(id);
  return toLoteConModelo(row, new Map([[id, imagenes]]));
}

export function getImagenesByLote(loteId: number): LoteImagenItem[] {
  const rows = db
    .select()
    .from(loteImagenes)
    .where(eq(loteImagenes.loteId, loteId))
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id))
    .all();
  return rows.map((r) => ({ id: r.id, path: r.path }));
}

export function addLoteImagen(
  loteId: number,
  path: string,
  orden?: number,
): LoteImagenItem {
  const inserted = db
    .insert(loteImagenes)
    .values({ loteId, path, orden: orden ?? 0 })
    .returning()
    .get();
  return { id: inserted.id, path: inserted.path };
}

export function deleteLoteImagen(
  loteId: number,
  imagenId: number,
): string | null {
  const row = db
    .select()
    .from(loteImagenes)
    .where(and(eq(loteImagenes.id, imagenId), eq(loteImagenes.loteId, loteId)))
    .get();
  if (!row) return null;
  db.delete(loteImagenes).where(eq(loteImagenes.id, imagenId)).run();
  return row.path;
}

function assertModeloExists(modeloId: number | null): string | null {
  if (modeloId === null) return null;
  return modeloExiste(modeloId) ? null : `modeloId ${modeloId} no existe`;
}

function numeroLoteEnUso(
  modeloId: number | null,
  numeroLote: string,
  excluirId?: number,
): boolean {
  const conditions = [
    eq(lotes.numeroLote, numeroLote),
    modeloId === null ? isNull(lotes.modeloId) : eq(lotes.modeloId, modeloId),
  ];
  if (excluirId !== undefined) {
    conditions.push(ne(lotes.id, excluirId));
  }
  const row = db
    .select({ id: lotes.id })
    .from(lotes)
    .where(and(...conditions))
    .get();
  return row !== undefined;
}

export function createLote(input: CreateLoteInput): LoteConModelo {
  const modeloId = input.modeloId ?? null;
  const modeloError = assertModeloExists(modeloId);
  if (modeloError) throw new Error(modeloError);
  if (numeroLoteEnUso(modeloId, input.numeroLote)) {
    throw new Error(
      `El número de lote ${input.numeroLote} ya existe para este modelo`,
    );
  }

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
  const current = db.select().from(lotes).where(eq(lotes.id, id)).get();
  if (!current) return null;

  const effectiveModeloId =
    input.modeloId !== undefined ? input.modeloId : current.modeloId;
  const effectiveNumero =
    input.numeroLote !== undefined ? input.numeroLote : current.numeroLote;
  if (numeroLoteEnUso(effectiveModeloId, effectiveNumero, id)) {
    throw new Error(
      `El número de lote ${effectiveNumero} ya existe para este modelo`,
    );
  }

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
