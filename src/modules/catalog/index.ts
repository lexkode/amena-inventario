import { asc, eq } from "drizzle-orm";
import { db } from "@db/client";
import { modelos, type Modelo, type ModeloTipo } from "@db/schema";

export type ModeloConCaracteristicas = Omit<Modelo, "caracteristicasJson"> & {
  caracteristicas: string[];
};

function parseCaracteristicas(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* ignore */
  }
  return [];
}

function parseModelo(row: Modelo): ModeloConCaracteristicas {
  const { caracteristicasJson, ...rest } = row;
  return { ...rest, caracteristicas: parseCaracteristicas(caracteristicasJson) };
}

export function getModelos(): ModeloConCaracteristicas[] {
  const rows = db
    .select()
    .from(modelos)
    .orderBy(asc(modelos.orden), asc(modelos.id))
    .all();
  return rows.map(parseModelo);
}

export function getModeloById(id: number): ModeloConCaracteristicas | null {
  const row = db.select().from(modelos).where(eq(modelos.id, id)).get();
  return row ? parseModelo(row) : null;
}

export type CreateModeloInput = {
  nombre: string;
  tipo: ModeloTipo;
  precioBase: number;
  terrenoM2: number;
  construccionM2: number;
  habitaciones: number;
  banos: number;
  parqueos?: number;
  dimensionesLote?: string | null;
  caracteristicas?: string[];
  orden?: number;
};

export function createModelo(input: CreateModeloInput): ModeloConCaracteristicas {
  const inserted = db
    .insert(modelos)
    .values({
      nombre: input.nombre,
      tipo: input.tipo,
      precioBase: input.precioBase,
      terrenoM2: input.terrenoM2,
      construccionM2: input.construccionM2,
      habitaciones: input.habitaciones,
      banos: input.banos,
      parqueos: input.parqueos ?? 1,
      dimensionesLote: input.dimensionesLote ?? null,
      caracteristicasJson: input.caracteristicas
        ? JSON.stringify(input.caracteristicas)
        : null,
      orden: input.orden ?? 0,
    })
    .returning()
    .get();
  return parseModelo(inserted);
}

export type UpdateModeloInput = Partial<Omit<CreateModeloInput, "caracteristicas">> & {
  caracteristicas?: string[];
};

export function updateModelo(
  id: number,
  input: UpdateModeloInput,
): ModeloConCaracteristicas | null {
  const updates: Partial<Modelo> = {};
  if (input.nombre !== undefined) updates.nombre = input.nombre;
  if (input.tipo !== undefined) updates.tipo = input.tipo;
  if (input.precioBase !== undefined) updates.precioBase = input.precioBase;
  if (input.terrenoM2 !== undefined) updates.terrenoM2 = input.terrenoM2;
  if (input.construccionM2 !== undefined) updates.construccionM2 = input.construccionM2;
  if (input.habitaciones !== undefined) updates.habitaciones = input.habitaciones;
  if (input.banos !== undefined) updates.banos = input.banos;
  if (input.parqueos !== undefined) updates.parqueos = input.parqueos;
  if (input.dimensionesLote !== undefined) updates.dimensionesLote = input.dimensionesLote;
  if (input.caracteristicas !== undefined) {
    updates.caracteristicasJson = JSON.stringify(input.caracteristicas);
  }
  if (input.orden !== undefined) updates.orden = input.orden;

  if (Object.keys(updates).length === 0) {
    return getModeloById(id);
  }

  const updated = db
    .update(modelos)
    .set(updates)
    .where(eq(modelos.id, id))
    .returning()
    .get();
  return updated ? parseModelo(updated) : null;
}

export function deleteModelo(id: number): boolean {
  const result = db.delete(modelos).where(eq(modelos.id, id)).run();
  return result.changes > 0;
}
