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

async function getImagenesMap(): Promise<Map<number, LoteImagenItem[]>> {
  const rows = await db
    .select()
    .from(loteImagenes)
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id));
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

export async function getLotes(): Promise<LoteConModelo[]> {
  const rows = await db
    .select({ lote: lotes, modelo: modelos })
    .from(lotes)
    .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
    .orderBy(asc(lotes.numeroLote), asc(lotes.id));
  const imagenes = await getImagenesMap();
  return rows.map((r) => toLoteConModelo(r, imagenes));
}

export async function getLoteById(id: number): Promise<LoteConModelo | null> {
  const row = (
    await db
      .select({ lote: lotes, modelo: modelos })
      .from(lotes)
      .leftJoin(modelos, eq(lotes.modeloId, modelos.id))
      .where(eq(lotes.id, id))
      .limit(1)
  )[0];
  if (!row) return null;
  const imagenes = await getImagenesByLote(id);
  return toLoteConModelo(row, new Map([[id, imagenes]]));
}

export async function getImagenesByLote(loteId: number): Promise<LoteImagenItem[]> {
  const rows = await db
    .select()
    .from(loteImagenes)
    .where(eq(loteImagenes.loteId, loteId))
    .orderBy(asc(loteImagenes.orden), asc(loteImagenes.id));
  return rows.map((r) => ({ id: r.id, path: r.path }));
}

export async function addLoteImagen(
  loteId: number,
  path: string,
  orden?: number,
): Promise<LoteImagenItem> {
  const [row] = await db
    .insert(loteImagenes)
    .values({ loteId, path, orden: orden ?? 0 })
    .returning();
  if (!row) throw new Error("No se pudo guardar la imagen del lote");
  return { id: row.id, path: row.path };
}

export async function deleteLoteImagen(
  loteId: number,
  imagenId: number,
): Promise<string | null> {
  const row = (
    await db
      .select()
      .from(loteImagenes)
      .where(and(eq(loteImagenes.id, imagenId), eq(loteImagenes.loteId, loteId)))
      .limit(1)
  )[0];
  if (!row) return null;
  await db.delete(loteImagenes).where(eq(loteImagenes.id, imagenId));
  return row.path;
}

async function assertModeloExists(modeloId: number | null): Promise<string | null> {
  if (modeloId === null) return null;
  return (await modeloExiste(modeloId)) ? null : `modeloId ${modeloId} no existe`;
}

async function numeroLoteEnUso(
  modeloId: number | null,
  numeroLote: string,
  excluirId?: number,
): Promise<boolean> {
  const conditions = [
    eq(lotes.numeroLote, numeroLote),
    modeloId === null ? isNull(lotes.modeloId) : eq(lotes.modeloId, modeloId),
  ];
  if (excluirId !== undefined) {
    conditions.push(ne(lotes.id, excluirId));
  }
  const row = (
    await db
      .select({ id: lotes.id })
      .from(lotes)
      .where(and(...conditions))
      .limit(1)
  )[0];
  return row !== undefined;
}

export async function createLote(input: CreateLoteInput): Promise<LoteConModelo> {
  const modeloId = input.modeloId ?? null;
  const modeloError = await assertModeloExists(modeloId);
  if (modeloError) throw new Error(modeloError);
  if (await numeroLoteEnUso(modeloId, input.numeroLote)) {
    throw new Error(
      `El número de lote ${input.numeroLote} ya existe para este modelo`,
    );
  }

  const [row] = await db
    .insert(lotes)
    .values({
      numeroLote: input.numeroLote,
      estado: input.estado,
      poligonoJson: JSON.stringify(input.poligono),
      modeloId: input.modeloId ?? null,
      terrenoM2: input.terrenoM2 ?? null,
      dimensionesLote: input.dimensionesLote ?? null,
    })
    .returning({ id: lotes.id });

  if (!row) {
    throw new Error("No se pudo recuperar el lote recién creado");
  }
  const created = await getLoteById(row.id);
  if (!created) {
    throw new Error("No se pudo recuperar el lote recién creado");
  }
  return created;
}

export async function updateLote(
  id: number,
  input: UpdateLoteInput,
): Promise<LoteConModelo | null> {
  const current = (
    await db.select().from(lotes).where(eq(lotes.id, id)).limit(1)
  )[0];
  if (!current) return null;

  const effectiveModeloId =
    input.modeloId !== undefined ? input.modeloId : current.modeloId;
  const effectiveNumero =
    input.numeroLote !== undefined ? input.numeroLote : current.numeroLote;
  if (await numeroLoteEnUso(effectiveModeloId, effectiveNumero, id)) {
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
    const modeloError = await assertModeloExists(input.modeloId);
    if (modeloError) throw new Error(modeloError);
    updates.modeloId = input.modeloId;
  }
  if (input.terrenoM2 !== undefined) updates.terrenoM2 = input.terrenoM2;
  if (input.dimensionesLote !== undefined) updates.dimensionesLote = input.dimensionesLote;

  if (Object.keys(updates).length > 0) {
    const updated = await db
      .update(lotes)
      .set(updates)
      .where(eq(lotes.id, id))
      .returning({ id: lotes.id });
    if (updated.length === 0) return null;
  }
  return getLoteById(id);
}

export async function deleteLote(id: number): Promise<boolean> {
  const deleted = await db
    .delete(lotes)
    .where(eq(lotes.id, id))
    .returning({ id: lotes.id });
  return deleted.length > 0;
}